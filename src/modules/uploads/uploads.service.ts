import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { WsEmitterService } from '../real-time/ws-emitter.service';
import { FilesService } from '../files/files.service';
import { UploadProvider } from 'src/common/types/upload-provider.interface';
import { StorageProvidersService } from '../storage-providers/storage-providers.service';
import { ProviderRegistryService } from '../provider-registry/provider-registry.service';
import { StorageProvider } from '../storage-providers/schemas/storage-provider.schema';
import { EncryptionService } from '../encryption/encryption.service';
import {
  FILE_EXTENSIONS,
  FileExtension,
  FileCategory,
} from '../../common/constants/file-extensions';

interface UploadToProvidersOptions {
  filePath: string;
  uploadId: string;
  providerIds: string[];
  userId: string;
  fileCategory: FileCategory;
}

interface UploadProgressData {
  uploadId: string;
  provider: string;
  providerId?: string;
  status: 'starting' | 'completed' | 'error';
  url?: string;
  error?: string;
}

@Injectable()
export class UploadsService {
  private readonly temporaryStoragePath = path.join(
    process.cwd(),
    'temp',
    'uploads',
  );
  constructor(
    private wsEmitter: WsEmitterService,
    private filesService: FilesService,
    private storageProvService: StorageProvidersService,
    private providerRegistry: ProviderRegistryService,
    private encryptionService: EncryptionService,
  ) {}

  // 🎯 GESTIÓN DE ARCHIVOS LOCALES
  async saveFileTemporarily(
    file: Express.Multer.File,
    uploadId: string,
  ): Promise<string> {
    const uploadDirectory = path.join(this.temporaryStoragePath, uploadId);
    await fs.promises.mkdir(uploadDirectory, { recursive: true });

    const filePath = path.join(uploadDirectory, file.originalname);

    if (file.buffer) {
      await fs.promises.writeFile(filePath, file.buffer);
    } else if (file.path) {
      await fs.promises.rename(file.path, filePath);
    } else {
      throw new Error('File content not found - no buffer or path available');
    }

    return filePath;
  }

  // 🎯 CATEGORIZACIÓN
  private determineFileCategory(fileName: string): FileCategory {
    const extension = path.extname(fileName).toLowerCase();

    // Iterate through all categories to find a match
    for (const [category, extensions] of Object.entries(FILE_EXTENSIONS)) {
      if ((extensions as readonly string[]).includes(extension)) {
        return category as FileCategory;
      }
    }

    throw new Error(`Unsupported file type: ${extension}`);
  }

  // 🎯 VALIDACIONES
  async checkUploadIdExists(uploadId: string): Promise<boolean> {
    return this.filesService.uploadIdExists(uploadId);
  }

  // 🎯 REGISTRO EN BASE DE DATOS
  async createFileRecord(
    uploadId: string,
    originalName: string,
    folderName: string,
  ) {
    const fileCategory = this.determineFileCategory(originalName);
    return this.filesService.createFileRecord({
      uploadId,
      originalName,
      folderName,
      fileCategory,
    });
  }

  // 🎯 PROCESAMIENTO A PROVIDERS
  async uploadToStorageProviders(
    options: UploadToProvidersOptions,
  ): Promise<void> {
    const { filePath, uploadId, providerIds, userId, fileCategory } = options;

    const configuredProviders = await this.findUserStorageProviders(
      providerIds,
      userId,
    );
    if (configuredProviders.length === 0) {
      this.notifyUploadProgress({
        uploadId,
        provider: '',
        status: 'error',
        error:
          'The provided storage providers are not configured or do not exist',
      });
    }

    let hasAnySuccessfulUpload = false;

    for (const provider of configuredProviders) {
      const { supportedExtensions, code, _id, name } = provider;

      if (!this.validateProviderSupportsFileType(provider, fileCategory)) {
        this.notifyUploadProgress({
          uploadId,
          provider: code,
          providerId: _id as string,
          status: 'error',
          error: `Provider '${name}' does not support '${fileCategory}' files`,
        });
        continue;
      }

      try {
        await this.uploadFileToSingleProvider(provider, filePath, uploadId);
        hasAnySuccessfulUpload = true;
      } catch (error) {
        console.error(`Upload failed for provider ${name}:`, error);
        this.notifyUploadProgress({
          uploadId,
          provider: name,
          status: 'error',
          error: error.message,
        });
      }
    }

    if (!hasAnySuccessfulUpload) {
      await this.filesService.markFileUploadAsFailed(
        uploadId,
        'All storage providers failed',
      );
    }
  }

  // 🎯 UTILIDADES PRIVADAS
  private async findUserStorageProviders(
    providerIds: string[],
    userId: string,
  ): Promise<StorageProvider[]> {
    return this.storageProvService.findByIds(providerIds, userId);
  }

  private validateProviderSupportsFileType(
    provider: StorageProvider,
    fileCategory: FileCategory,
  ): boolean {
    // Get all extensions for the given category
    const categoryExtensions = FILE_EXTENSIONS[fileCategory];

    // Check if provider supports at least one extension from this category
    return categoryExtensions.some((extension) =>
      provider.supportedExtensions.includes(extension),
    );
  }

  private findStorageProvider(providerCode: string): UploadProvider {
    return this.providerRegistry.getProviderService(providerCode);
  }

  private decryptProviderConfig(
    encryptedConfig: Record<string, any>,
  ): Record<string, any> {
    const decryptedConfig: Record<string, any> = {};

    for (const [key, encryptedValue] of Object.entries(encryptedConfig)) {
      decryptedConfig[key] = this.encryptionService.decrypt(encryptedValue);
    }

    return decryptedConfig;
  }

  private async uploadFileToSingleProvider(
    provider: StorageProvider,
    filePath: string,
    uploadId: string,
  ): Promise<void> {
    const { code, _id, name } = provider;

    this.notifyUploadProgress({
      uploadId,
      provider: code,
      providerId: _id as string,
      status: 'starting',
    });

    // Desencriptar configuración del provider
    const decryptedConfig = this.decryptProviderConfig(provider.config);

    const uploadFunction = this.findStorageProvider(code);
    const uploadResult = await uploadFunction.upload({
      providerId: _id as string,
      providerConfig: decryptedConfig,
      filePath,
      originalName: path.basename(filePath),
      uploadId,
    });

    await this.filesService.attachProviderUrl({
      uploadId,
      provider,
      downloadUrl: uploadResult.url,
      thumbnailUrl: uploadResult.metadata.thumbnail,
    });

    this.notifyUploadProgress({
      uploadId,
      provider: name,
      providerId: _id as string,
      status: 'completed',
      url: uploadResult.url,
    });
  }

  private notifyUploadProgress(data: UploadProgressData): void {
    this.wsEmitter.emit('upload-progress', data);
  }
}
