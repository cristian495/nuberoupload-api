import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigSource } from 'src/common/enums/config-source.enum';
import { StorageProvider } from 'src/modules/storage-providers/schemas/storage-provider.schema';
import { ProviderTemplate } from 'src/modules/provider-templates/schemas/provider-template.schema';
import { EncryptionService } from 'src/modules/encryption/encryption.service';
import { ProviderRegistryService } from 'src/modules/provider-registry/provider-registry.service';
import { ConnectionTestResult } from 'src/common/interfaces/config-resolver.interface';
import {
  StorageProviderStrategy,
  CreateStorageProviderData,
  DeleteStorageProviderResult,
  ValidationResult,
} from './storage-provider.strategy';

@Injectable()
export class DatabaseConfigStrategy extends StorageProviderStrategy {
  readonly configSource = ConfigSource.DATABASE;

  constructor(
    @InjectModel(StorageProvider.name)
    private storageProvModel: Model<StorageProvider>,
    private encryptionService: EncryptionService,
    private providerRegistry: ProviderRegistryService,
  ) {
    super();
  }

  async createStorageProvider(
    data: CreateStorageProviderData,
  ): Promise<StorageProvider> {
    // Validar template
    this.validateTemplate(data.template, data.config);

    if (!data.config) {
      throw new Error('Config is required for DATABASE providers');
    }

    // Encriptar configuración
    const { encryptedConfig, lastCharsConfig } = this.encryptConfig(
      data.config,
    );

    // Crear datos base del provider
    const baseData = this.createBaseProviderData(data);

    // Crear el provider con configuración encriptada
    const newProvider = await this.storageProvModel.create({
      ...baseData,
      config: encryptedConfig,
      configLastChars: lastCharsConfig,
    });

    return newProvider;
  }

  async deleteStorageProvider(
    provider: StorageProvider,
  ): Promise<DeleteStorageProviderResult> {
    try {
      await this.storageProvModel.findByIdAndDelete(provider._id);

      return {
        success: true,
        message: 'Database provider deleted successfully',
        cleanupActions: [
          'Removed provider from database',
          'Encrypted credentials deleted',
        ],
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete database provider',
        cleanupActions: [],
        error: error.message,
      };
    }
  }

  async testConnection(
    provider: StorageProvider,
    runtimeCredentials?: Record<string, any>,
  ): Promise<ConnectionTestResult> {
    const result: ConnectionTestResult = {
      isHealthy: false,
      error: undefined,
    };

    try {
      // Obtener el servicio del proveedor
      const providerService = this.providerRegistry.getProviderService(
        provider.code,
      );
      if (!providerService) {
        result.error = 'Provider service not available';
        await this.updateConnectionStatus(provider._id.toString(), result);
        return result;
      }

      // Verificar que el provider tenga configuración
      if (!provider.config) {
        result.error = 'Provider configuration not found';
        await this.updateConnectionStatus(provider._id.toString(), result);
        return result;
      }

      // Desencriptar la configuración
      const decryptedConfig = this.encryptionService.decryptProviderConfig(
        provider.config,
      );

      // Probar la conexión
      const testResult = await providerService.testConnection(decryptedConfig);
      result.isHealthy = testResult.isHealthy;
      result.error = testResult.error;
    } catch (error) {
      result.error = error.message || 'Unknown connection error';
    }

    // Actualizar el estado en la base de datos
    await this.updateConnectionStatus(provider._id.toString(), result);
    return result;
  }

  async validateStorageProvider(
    provider: StorageProvider,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar que tenga configuración
    if (!provider.config) {
      errors.push('Configuration is required for DATABASE providers');
    }

    // Validar que el servicio del proveedor esté disponible
    if (!this.providerRegistry.isProviderAvailable(provider.code)) {
      errors.push(`Provider service not available: ${provider.code}`);
    }

    // Validar que la configuración se pueda desencriptar
    if (provider.config) {
      try {
        this.encryptionService.decryptProviderConfig(provider.config);
      } catch (error) {
        errors.push('Failed to decrypt provider configuration');
      }
    }

    // Validar extensiones soportadas
    if (
      !provider.supportedExtensions ||
      provider.supportedExtensions.length === 0
    ) {
      warnings.push('No supported extensions defined');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Métodos privados específicos para DATABASE
  private encryptConfig(config: Record<string, any>) {
    const encryptedConfig = Object.entries(config).reduce(
      (acc, [key, value]) => {
        const encryptedValue = this.encryptionService.encrypt(value);
        return { ...acc, [key]: encryptedValue };
      },
      {},
    );

    const lastCharsConfig = Object.entries(config).reduce(
      (acc, [key, value]) => {
        const len = value.length;
        const visibleCount = Math.ceil(len * 0.1);
        const maskedPart = '*'.repeat(len - visibleCount);
        const visiblePart = value.slice(-visibleCount);
        return { ...acc, [key]: maskedPart + visiblePart };
      },
      {},
    );

    return {
      encryptedConfig,
      lastCharsConfig,
    };
  }

  private async updateConnectionStatus(
    providerId: string,
    connectionResult: ConnectionTestResult,
  ): Promise<void> {
    await this.storageProvModel.findByIdAndUpdate(providerId, {
      lastConnectionCheck: new Date(),
      isConnectionHealthy: connectionResult.isHealthy,
      connectionError: connectionResult.error || null,
    });
  }
}
