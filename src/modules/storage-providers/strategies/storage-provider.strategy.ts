import { ConfigSource } from 'src/common/enums/config-source.enum';
import { StorageProvider } from 'src/modules/storage-providers/schemas/storage-provider.schema';
import { ProviderTemplate } from 'src/modules/provider-templates/schemas/provider-template.schema';
import { ConnectionTestResult } from 'src/common/interfaces/config-resolver.interface';

// Tipos para la creación de providers
export interface CreateStorageProviderData {
  userId: string;
  name: string;
  templateId: string;
  template: ProviderTemplate;
  config?: Record<string, any>;
  supportedExtensions?: string[];
}

// Resultado de eliminación
export interface DeleteStorageProviderResult {
  success: boolean;
  message: string;
  cleanupActions: string[];
  error?: string;
}

// Resultado de validación
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Estrategia base abstracta para Storage Providers
export abstract class StorageProviderStrategy {
  abstract readonly configSource: ConfigSource;

  // Métodos que TODAS las estrategias deben implementar
  abstract createStorageProvider(
    data: CreateStorageProviderData,
  ): Promise<StorageProvider>;

  abstract deleteStorageProvider(
    provider: StorageProvider,
  ): Promise<DeleteStorageProviderResult>;

  abstract testConnection(
    provider: StorageProvider,
    runtimeCredentials?: Record<string, any>,
  ): Promise<ConnectionTestResult>;

  abstract validateStorageProvider(
    provider: StorageProvider,
  ): Promise<ValidationResult>;

  // Método compartido para validar template (implementación base)
  protected validateTemplate(
    template: ProviderTemplate,
    config?: Record<string, any>,
  ): void {
    if (!template) {
      throw new Error('Template is required');
    }

    // Validar campos requeridos si hay configuración
    if (config) {
      const requiredFields = template.fields.filter((field) => field.required);
      for (const field of requiredFields) {
        if (!config[field.key]) {
          throw new Error(`Required field '${field.key}' is missing in config`);
        }
      }
    }
  }

  // Método compartido para crear datos base del provider
  protected createBaseProviderData(
    data: CreateStorageProviderData,
  ): Partial<StorageProvider> {
    return {
      userId: data.userId,
      name: data.name,
      code: data.template.code,
      templateId: data.templateId,
      supportedExtensions:
        data.supportedExtensions || data.template.supportedExtensions,
      isActive: true,
      configSource: this.configSource,
    };
  }
}
