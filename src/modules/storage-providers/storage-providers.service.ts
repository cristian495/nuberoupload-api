import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { StorageProvider } from './schemas/storage-provider.schema';
import { Model, ObjectId } from 'mongoose';
import { CreateStorageProviderDto } from './dto/create-storage-provider.dto';
import { CreateProviderFromTemplateDto } from './dto/create-provider-from-template.dto';
import { EncryptionService } from '../encryption/encryption.service';
import { ProviderTemplatesService } from '../provider-templates/provider-templates.service';
import { ProviderTemplate } from '../provider-templates/schemas/provider-template.schema';
import { ProviderRegistryService } from '../provider-registry/provider-registry.service';
import { ConnectionTestResult } from '../../common/types/upload-provider.interface';
import { FileItem } from '../files/schemas/file-item.schema';

@Injectable()
export class StorageProvidersService {
  constructor(
    @InjectModel(StorageProvider.name)
    private storageProvModel: Model<StorageProvider>,
    @InjectModel(FileItem.name)
    private fileItemModel: Model<FileItem>,
    private encryptionService: EncryptionService,
    private providerTemplatesService: ProviderTemplatesService,
    private providerRegistry: ProviderRegistryService,
  ) {}

  private encryptConfig(config: Record<string, any>) {
    const encryptedConfig = Object.entries(config).reduce((acc, config) => {
      const [key, value] = config;
      const encyrptedValue = this.encryptionService.encrypt(value);

      return { ...acc, [key]: encyrptedValue };
    }, {});

    const lastCharsConfig = Object.entries(config).reduce((acc, config) => {
      const [key, value] = config;
      const len = value.length;
      const visibleCount = Math.ceil(len * 0.1);
      const maskedPart = '*'.repeat(len - visibleCount);
      const visiblePart = value.slice(-visibleCount);

      return { ...acc, [key]: maskedPart + visiblePart };
    }, {});

    return {
      encryptedConfig: encryptedConfig,
      lastCharsConfig: lastCharsConfig,
    };
  }

  private validateAgainstTemplate(
    template: ProviderTemplate,
    config: Record<string, any>,
  ) {
    // Validar campos requeridos
    const requiredFields = template.fields.filter((field) => field.required);
    for (const field of requiredFields) {
      if (!config[field.key]) {
        throw new BadRequestException(
          `Required field '${field.key}' is missing in config`,
        );
      }
    }
  }

  async getStorageProviders(userId: string | ObjectId) {
    const list = await this.storageProvModel.find({
      userId,
    });

    return list;
  }

  async findByIds(
    providerIds: string[],
    userId: string | ObjectId,
  ): Promise<StorageProvider[]> {
    return this.storageProvModel.find({
      _id: { $in: providerIds },
      userId,
    });
  }

  async getAvailableTemplates() {
    const availableCodes = this.providerRegistry.getAvailableProviderCodes();

    return this.providerTemplatesService.findByAvailableCodes(availableCodes);
  }

  async createProviderFromTemplate(
    props: CreateProviderFromTemplateDto,
    userId: string | ObjectId,
  ) {
    const template = await this.providerTemplatesService.findOneById(
      props.templateId,
    );

    if (!template) {
      throw new BadRequestException(
        `Template with id ${props.templateId} not found`,
      );
    }

    if (!this.providerRegistry.isProviderAvailable(template.code)) {
      throw new BadRequestException(
        `Provider service not available: ${template.code}`,
      );
    }

    this.validateAgainstTemplate(template, props.config);

    const { encryptedConfig, lastCharsConfig } = this.encryptConfig(
      props.config,
    );

    const newProvider = await this.storageProvModel.create({
      userId,
      name: props.name,
      code: template.code, // Usar el code del template
      templateId: props.templateId,
      config: encryptedConfig,
      configLastChars: lastCharsConfig,
      supportedExtensions: template.supportedExtensions,
    });

    // Probar conexión al crear el proveedor
    try {
      await this.testProviderConnection(newProvider._id.toString(), userId);
    } catch (error) {
      // No fallar la creación si falla el test de conexión
      console.warn(
        `Connection test failed for provider ${newProvider._id}:`,
        error,
      );
    }

    return newProvider;
  }

  async testProviderConnection(
    providerId: string,
    userId: string | ObjectId,
  ): Promise<ConnectionTestResult> {
    const provider = await this.storageProvModel.findOne({
      _id: providerId,
      userId,
    });

    if (!provider) {
      throw new BadRequestException('Provider not found');
    }

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
        await this.updateConnectionStatus(providerId, result);
        return result;
      }

      // Desencriptar la configuración
      const decryptedConfig = Object.entries(provider.config).reduce(
        (acc, [key, value]) => {
          acc[key] = this.encryptionService.decrypt(value as string);
          return acc;
        },
        {} as Record<string, any>,
      );

      // Probar la conexión
      const testResult = await providerService.testConnection(decryptedConfig);
      result.isHealthy = testResult.isHealthy;
      result.error = testResult.error;
    } catch (error) {
      result.error = error.message || 'Unknown connection error';
    }

    // Actualizar el estado en la base de datos
    await this.updateConnectionStatus(providerId, result);
    return result;
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

  async deleteProvider(
    providerId: string,
    userId: string | ObjectId,
  ): Promise<{ success: boolean; message: string }> {
    // Verificar que el proveedor existe y pertenece al usuario
    const provider = await this.storageProvModel.findOne({
      _id: providerId,
      userId,
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Encontrar todos los archivos que tienen este proveedor
    const fileItems = await this.fileItemModel.find({
      'providers._id': providerId,
    });

    // Remover el proveedor de todos los archivos
    for (const fileItem of fileItems) {
      const updatedUploads = fileItem.uploads.filter(
        (upload) => upload.providerId !== providerId,
      );

      await this.fileItemModel.findByIdAndUpdate(fileItem._id, {
        uploads: updatedUploads,
      });
    }

    // Eliminar el proveedor
    await this.storageProvModel.findByIdAndDelete(providerId);

    return {
      success: true,
      message: `Provider deleted successfully. Updated ${fileItems.length} files.`,
    };
  }

  async findById(providerId: string): Promise<StorageProvider | null> {
    return this.storageProvModel.findById(providerId);
  }
}
