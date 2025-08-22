import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { StorageProvider } from './schemas/storage-provider.schema';
import { Model, ObjectId } from 'mongoose';
import { CreateStorageProviderDto } from './dto/create-storage-provider.dto';
import { CreateProviderFromTemplateDto } from './dto/create-provider-from-template.dto';
import { EncryptionService } from '../encryption/encryption.service';
import { ProviderTemplatesService } from '../provider-templates/provider-templates.service';
import { ProviderTemplate } from '../provider-templates/schemas/provider-template.schema';
import { ProviderRegistryService } from '../provider-registry/provider-registry.service';

@Injectable()
export class StorageProvidersService {
  constructor(
    @InjectModel(StorageProvider.name)
    private storageProvModel: Model<StorageProvider>,
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

    return this.storageProvModel.create({
      userId,
      name: props.name,
      code: template.code, // Usar el code del template
      templateId: props.templateId,
      config: encryptedConfig,
      configLastChars: lastCharsConfig,
      supportedExtensions: template.supportedExtensions,
    });
  }
}
