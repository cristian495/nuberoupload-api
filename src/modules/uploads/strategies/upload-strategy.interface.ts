import { ConfigSource } from 'src/common/enums/config-source.enum';
import { StorageProvider } from 'src/modules/storage-providers/schemas/storage-provider.schema';
import {
  FILE_EXTENSIONS,
  FileCategory,
} from 'src/common/constants/file-extensions';
import {
  UploadProviderData as IUploadProviderData,
  DeleteProviderData,
  DeleteResult,
} from 'src/common/interfaces/provider-operations.interface';
import { UploadResult as CommonUploadResult } from 'src/common/types/upload-result';

// Re-export common types for backward compatibility
export type UploadProviderData = IUploadProviderData;
export { DeleteProviderData, DeleteResult };

// Local UploadResult for strategy responses (simpler than common UploadResult)
export interface UploadResult {
  success: boolean;
  providerId: string;
  providerCode: string;
  url?: string;
  error?: string;
}

export abstract class UploadStrategy {
  abstract readonly configSource: ConfigSource;

  /**
   * Process file upload to a storage provider
   */
  abstract processUpload(data: UploadProviderData): Promise<UploadResult>;

  /**
   * Process file deletion from a storage provider
   */
  abstract processDelete(data: DeleteProviderData): Promise<DeleteResult>;

  /**
   * Validate that provider configuration is valid for this strategy
   */
  abstract validateProvider(
    provider: StorageProvider,
    fileCategory: FileCategory,
  ): boolean;

  /**
   * Helper method to validate that provider supports the file category
   */
  protected validateProviderSupportsFileType(
    provider: StorageProvider,
    fileCategory: FileCategory,
  ): boolean {
    const categoryExtensions = FILE_EXTENSIONS[fileCategory];
    return categoryExtensions.some((extension) =>
      provider.supportedExtensions.includes(extension),
    );
  }
}
