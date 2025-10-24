import { StorageProvider } from '../../modules/storage-providers/schemas/storage-provider.schema';
import { FileCategory } from '../constants/file-extensions';
import { ConfigSource } from '../enums/config-source.enum';
import { UploadResult } from '../types/upload-result';
import { ConnectionTestResult } from '../types/upload-provider.interface';
import { ProviderConfig } from '../types/provider-config';

/**
 * Delete operation result
 */
export interface DeleteResult {
  success: boolean;
  providerId: string;
  providerCode: string;
  error?: string;
}

/**
 * Validation result for provider configuration
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Interface for provider management operations
 * Implemented by: StorageProvidersService
 */
export interface IProviderManager {
  /**
   * Create a new storage provider
   */
  createProvider(
    data: CreateProviderData,
    configSource: ConfigSource,
  ): Promise<StorageProvider>;

  /**
   * Delete a storage provider
   */
  deleteProvider(providerId: string, userId: string): Promise<void>;

  /**
   * Test connection to a provider
   */
  testConnection(
    providerId: string,
    userId: string,
    runtimeCredentials?: ProviderConfig,
  ): Promise<ConnectionTestResult>;

  /**
   * Get provider by ID
   */
  findById(providerId: string): Promise<StorageProvider | null>;

  /**
   * Get multiple providers by IDs for a user
   */
  findByIds(
    providerIds: string[],
    userId: string,
  ): Promise<StorageProvider[]>;
}

/**
 * Interface for file operations
 * Implemented by: UploadsService
 */
export interface IFileOperations {
  /**
   * Upload file to multiple storage providers
   */
  uploadToProviders(options: UploadOptions): Promise<void>;

  /**
   * Delete file from all providers
   */
  deleteFromProviders(options: DeleteOptions): Promise<void>;

  /**
   * Validate that provider supports file category
   */
  validateProviderSupport(
    provider: StorageProvider,
    fileCategory: FileCategory,
  ): boolean;
}

/**
 * Interface for upload/delete strategies
 * Implemented by: DatabaseUploadStrategy, RuntimeUploadStrategy
 */
export interface IProviderStrategy {
  /**
   * Config source this strategy handles
   */
  readonly configSource: ConfigSource;

  /**
   * Process file upload to a provider
   */
  processUpload(data: UploadProviderData): Promise<UploadResult>;

  /**
   * Process file deletion from a provider
   */
  processDelete(data: DeleteProviderData): Promise<DeleteResult>;

  /**
   * Validate that provider configuration is valid for this strategy
   */
  validateProvider(
    provider: StorageProvider,
    fileCategory: FileCategory,
  ): boolean;
}

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Data for creating a provider
 */
export interface CreateProviderData {
  userId: string;
  name: string;
  templateId: string;
  description?: string;
  config?: ProviderConfig; // Required for DATABASE, omitted for RUNTIME
  supportedExtensions?: string[];
}

/**
 * Runtime provider credentials in upload/delete requests
 */
export interface RuntimeProviderCredentials {
  providerId: string;
  credentials: ProviderConfig;
}

/**
 * Options for uploading files to providers
 */
export interface UploadOptions {
  filePath: string;
  fileId: string;
  providerIds: string[];
  userId: string;
  fileCategory: FileCategory;
  providerCredentials?: RuntimeProviderCredentials[];
}

/**
 * Options for deleting files from providers
 */
export interface DeleteOptions {
  fileId: string;
  userId: string;
  uploads: Array<{
    providerCode: string;
    providerId: string;
    metadata?: Record<string, any>;
  }>;
  providerCredentials?: RuntimeProviderCredentials[];
}

/**
 * Data passed to strategy for upload
 */
export interface UploadProviderData {
  provider: StorageProvider;
  filePath: string;
  fileId: string;
  folderName: string;
  runtimeCredentials?: ProviderConfig;
}

/**
 * Data passed to strategy for deletion
 */
export interface DeleteProviderData {
  provider: StorageProvider;
  metadata: Record<string, any>;
  runtimeCredentials?: ProviderConfig;
}
