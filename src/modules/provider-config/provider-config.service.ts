import { Injectable } from '@nestjs/common';
import { ConfigSource } from 'src/common/enums/config-source.enum';
import { StorageProvider } from '../storage-providers/schemas/storage-provider.schema';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class ProviderConfigService {
  constructor(private encryptionService: EncryptionService) {}

  // Método para resolver configuración únicamente
  async resolveConfig(
    provider: StorageProvider,
    runtimeCredentials?: Record<string, any>,
  ): Promise<Record<string, any>> {
    switch (provider.configSource) {
      case ConfigSource.DATABASE:
        if (!provider.config) {
          throw new Error(
            'Provider configuration not found for DATABASE provider',
          );
        }
        return this.encryptionService.decryptProviderConfig(provider.config);

      case ConfigSource.RUNTIME:
        if (!runtimeCredentials) {
          throw new Error('Runtime credentials required for RUNTIME provider');
        }
        return runtimeCredentials;

      default:
        throw new Error(`Unsupported config source: ${provider.configSource}`);
    }
  }
}