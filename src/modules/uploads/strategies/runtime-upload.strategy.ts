import { Injectable } from '@nestjs/common';
import { ConfigSource } from 'src/common/enums/config-source.enum';
import { ProviderRegistryService } from 'src/modules/provider-registry/provider-registry.service';
import { ProviderConfigService } from 'src/modules/provider-config/provider-config.service';
import { StorageProvider } from 'src/modules/storage-providers/schemas/storage-provider.schema';
import { FileCategory } from 'src/common/constants/file-extensions';
import {
  UploadStrategy,
  UploadProviderData,
  UploadResult,
  DeleteProviderData,
  DeleteResult,
} from './upload-strategy.interface';
import path from 'path';

@Injectable()
export class RuntimeUploadStrategy extends UploadStrategy {
  readonly configSource = ConfigSource.RUNTIME;

  constructor(
    private providerRegistry: ProviderRegistryService,
    private providerConfigService: ProviderConfigService,
  ) {
    super();
  }

  async processUpload(data: UploadProviderData): Promise<UploadResult> {
    const { provider, filePath, fileId, folderName, runtimeCredentials } = data;

    try {
      // Validar que se proporcionen credenciales runtime
      if (!runtimeCredentials) {
        throw new Error('Runtime credentials required for RUNTIME provider');
      }

      // Obtener configuración usando credenciales runtime
      const config = await this.providerConfigService.resolveConfig(
        provider,
        runtimeCredentials,
      );

      // Obtener el servicio del proveedor
      const providerService = this.providerRegistry.getProviderService(
        provider.code,
      );
      if (!providerService) {
        throw new Error(
          `Provider service not found for code: ${provider.code}`,
        );
      }

      // Ejecutar upload
      await providerService.upload({
        providerId: provider._id.toString(),
        providerConfig: config,
        filePath,
        originalName: path.basename(filePath),
        fileId,
        folderName,
      });

      return {
        success: true,
        providerId: provider._id.toString(),
        providerCode: provider.code,
      };
    } catch (error) {
      return {
        success: false,
        providerId: provider._id.toString(),
        providerCode: provider.code,
        error: error.message,
      };
    }
  }

  async processDelete(data: DeleteProviderData): Promise<DeleteResult> {
    const { provider, metadata, runtimeCredentials } = data;

    try {
      // ⚠️ LIMITACIÓN: RUNTIME providers requieren credenciales para eliminar
      if (!runtimeCredentials) {
        throw new Error(
          'Cannot delete from RUNTIME provider without credentials. ' +
            'RUNTIME providers do not store credentials, so delete operations ' +
            'require credentials to be provided at request time.',
        );
      }

      // Obtener configuración usando credenciales runtime
      const config = await this.providerConfigService.resolveConfig(
        provider,
        runtimeCredentials,
      );

      // Obtener el servicio del proveedor
      const providerService =
        this.providerRegistry.getProviderService(provider.code);
      if (!providerService) {
        throw new Error(
          `Provider service not found for code: ${provider.code}`,
        );
      }

      // Ejecutar delete
      const deleteResult = await providerService.delete({
        providerId: provider._id.toString(),
        providerConfig: config,
        metadata,
      });

      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Delete operation failed');
      }

      return {
        success: true,
        providerId: provider._id.toString(),
        providerCode: provider.code,
      };
    } catch (error) {
      return {
        success: false,
        providerId: provider._id.toString(),
        providerCode: provider.code,
        error: error.message,
      };
    }
  }

  validateProvider(
    provider: StorageProvider,
    fileCategory: FileCategory,
  ): boolean {
    // Validar que soporte el tipo de archivo
    return this.validateProviderSupportsFileType(provider, fileCategory);
  }
}
