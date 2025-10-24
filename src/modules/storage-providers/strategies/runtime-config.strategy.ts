import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigSource } from 'src/common/enums/config-source.enum';
import { StorageProvider } from 'src/modules/storage-providers/schemas/storage-provider.schema';
import { ProviderRegistryService } from 'src/modules/provider-registry/provider-registry.service';
import { ConnectionTestResult } from 'src/common/interfaces/config-resolver.interface';
import {
  StorageProviderStrategy,
  CreateStorageProviderData,
  DeleteStorageProviderResult,
  ValidationResult,
} from './storage-provider.strategy';

@Injectable()
export class RuntimeConfigStrategy extends StorageProviderStrategy {
  readonly configSource = ConfigSource.RUNTIME;

  constructor(
    @InjectModel(StorageProvider.name)
    private storageProvModel: Model<StorageProvider>,
    private providerRegistry: ProviderRegistryService,
  ) {
    super();
  }

  async createStorageProvider(
    data: CreateStorageProviderData,
  ): Promise<StorageProvider> {
    // Validar template (sin config ya que es runtime)
    this.validateTemplate(data.template);

    // Crear datos base del provider
    const baseData = this.createBaseProviderData(data);

    // Crear el provider sin configuración almacenada
    const newProvider = await this.storageProvModel.create({
      ...baseData,
      // No almacenamos config ni configLastChars para providers RUNTIME
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
        message: 'Runtime provider deleted successfully',
        cleanupActions: [
          'Removed provider from database',
          'No credentials were stored to delete',
        ],
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete runtime provider',
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
      // Para providers RUNTIME, las credenciales son obligatorias
      if (!runtimeCredentials) {
        result.error = 'Runtime credentials required for this provider';
        return result;
      }

      // Obtener el servicio del proveedor
      const providerService = this.providerRegistry.getProviderService(
        provider.code,
      );
      if (!providerService) {
        result.error = 'Provider service not available';
        return result;
      }

      // Probar la conexión usando las credenciales runtime
      const testResult =
        await providerService.testConnection(runtimeCredentials);
      result.isHealthy = testResult.isHealthy;
      result.error = testResult.error;
    } catch (error) {
      result.error = error.message || 'Unknown connection error';
    }

    // Para providers RUNTIME no actualizamos el estado en BD
    // ya que depende de credenciales específicas de cada uso
    return result;
  }

  async validateStorageProvider(
    provider: StorageProvider,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar que NO tenga configuración almacenada
    if (provider.config) {
      warnings.push('RUNTIME provider should not have stored configuration');
    }

    // Validar que el servicio del proveedor esté disponible
    if (!this.providerRegistry.isProviderAvailable(provider.code)) {
      errors.push(`Provider service not available: ${provider.code}`);
    }

    // Validar extensiones soportadas
    if (
      !provider.supportedExtensions ||
      provider.supportedExtensions.length === 0
    ) {
      warnings.push('No supported extensions defined');
    }

    // Validar que el configSource sea correcto
    if (provider.configSource !== ConfigSource.RUNTIME) {
      errors.push('Provider configSource must be RUNTIME');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
