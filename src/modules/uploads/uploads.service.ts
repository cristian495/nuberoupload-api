import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { WsEmitterService } from '../real-time/ws-emitter.service';
import { FilesService } from '../files/files.service';
import { UploadProvider } from 'src/common/types/upload-provider.interface';
import { UploadResult } from 'src/common/types/upload-result';
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
  fileId: string;
  providerIds: string[];
  userId: string;
  fileCategory: FileCategory;
}

interface DeleteFromProvidersOptions {
  fileId: string;
  userId: string;
  uploads: UploadResult[];
}

interface UploadProgressData {
  fileId: string;
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
    fileId: string,
  ): Promise<string> {
    const uploadDirectory = path.join(this.temporaryStoragePath, fileId);
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

  // 🎯 REGISTRO EN BASE DE DATOS
  async createFileRecord(
    userId: string,
    originalName: string,
    folderName: string,
  ) {
    const fileCategory = this.determineFileCategory(originalName);
    return this.filesService.createFileRecord({
      userId,
      originalName,
      folderName,
      fileCategory,
    });
  }

  // 🎯 PROCESAMIENTO A PROVIDERS
  async uploadToStorageProviders(
    options: UploadToProvidersOptions,
  ): Promise<void> {
    console.log(
      '[Upload Service] Starting upload to storage providers',
      options,
    );
    const { filePath, fileId, providerIds, userId, fileCategory } = options;

    const configuredProviders = await this.findUserStorageProviders(
      providerIds,
      userId,
    );

    for (const provider of configuredProviders) {
      const { supportedExtensions, code, _id, name } = provider;

      try {
        if (!this.validateProviderSupportsFileType(provider, fileCategory)) {
          throw new Error(
            `Provider '${name}' does not support '${fileCategory}' files`,
          );
        }
        await this.uploadFileToSingleProvider(provider, filePath, fileId);
      } catch (error) {
        console.error(error);
        this.notifyUploadProgress({
          fileId,
          providerId: _id.toString(),
          status: 'error',
          error: error.message,
        });
      }
    }
  }

  async findUserStorageProviders(
    providerIds: string[],
    userId: string,
  ): Promise<StorageProvider[]> {
    return this.storageProvService.findByIds(providerIds, userId);
  }

  async getFileById(fileId: string) {
    return this.filesService.getFileById(fileId);
  }
  // 🎯 UTILIDADES PRIVADAS

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

  private async uploadFileToSingleProvider(
    provider: StorageProvider,
    filePath: string,
    fileId: string,
  ): Promise<void> {
    const { code, _id, name } = provider;

    this.notifyUploadProgress({
      fileId,
      providerId: _id.toString(),
      status: 'starting',
    });

    // Obtener información del archivo incluyendo la carpeta
    const fileInfo = await this.filesService.getFileById(fileId);
    if (!fileInfo || !fileInfo.folderId) {
      throw new Error(
        `File or folder information not found for fileId: ${fileId}`,
      );
    }

    const folderName = (fileInfo.folderId as any).name;
    if (!folderName) {
      throw new Error(`Folder name not found for fileId: ${fileId}`);
    }

    // Desencriptar configuración del provider
    const decryptedConfig = this.encryptionService.decryptProviderConfig(
      provider.config,
    );

    const uploadFunction = this.findStorageProvider(code);
    const uploadResult = await uploadFunction.upload({
      providerId: _id.toString(),
      providerConfig: decryptedConfig,
      filePath,
      originalName: path.basename(filePath),
      fileId,
      folderName,
    });

    await this.filesService.addUploadResult(fileId, uploadResult);

    this.notifyUploadProgress({
      fileId,
      providerId: _id.toString(),
      status: 'completed',
      url: uploadResult.url,
    });
  }

  private notifyUploadProgress(data: UploadProgressData): void {
    this.wsEmitter.emit('upload-progress', data);
  }

  // 🎯 ELIMINACIÓN DE ARCHIVOS
  async deleteFromAllProviders(
    options: DeleteFromProvidersOptions,
  ): Promise<void> {
    const { fileId, userId, uploads } = options;

    console.log(
      `[Delete] Starting deletion for file ${fileId} from ${uploads.length} providers`,
    );

    for (const upload of uploads) {
      const { providerCode, providerId } = upload;

      try {
        await this.deleteFileFromSingleProvider(upload, fileId);
      } catch (error) {
        console.error(`Delete failed for provider ${providerCode}:`, error);
        this.notifyDeletionProgress({
          fileId,
          provider: providerCode,
          providerId,
          status: 'error',
          error: error.message,
        });
      }
    }
  }

  private async deleteFileFromSingleProvider(
    upload: UploadResult,
    fileId: string,
  ): Promise<void> {
    const { providerCode, providerId, metadata } = upload;

    this.notifyDeletionProgress({
      fileId,
      provider: providerCode,
      providerId,
      status: 'starting',
    });

    // Obtener configuración del proveedor
    const storageProvider = await this.storageProvService.findById(providerId);
    if (!storageProvider) {
      throw new Error(`Storage provider not found: ${providerId}`);
    }

    const decryptedConfig = this.encryptionService.decryptProviderConfig(
      storageProvider.config,
    );

    const deleteFunction = this.findStorageProvider(providerCode);
    const deleteResult = await deleteFunction.delete({
      providerId,
      providerConfig: decryptedConfig,
      metadata,
    });

    if (!deleteResult.success) {
      throw new Error(deleteResult.error || 'Delete operation failed');
    }

    // Remover el upload del archivo en la base de datos
    await this.filesService.removeUploadFromFile(fileId, providerId);

    console.log(`[Delete] ${providerCode} ${fileId}: deleted successfully`);
    this.notifyDeletionProgress({
      fileId,
      provider: providerCode,
      providerId,
      status: 'completed',
    });
  }

  private notifyDeletionProgress(data: {
    fileId: string;
    provider: string;
    providerId?: string;
    status: 'starting' | 'completed' | 'error';
    error?: string;
  }): void {
    this.wsEmitter.emit('delete-progress', data);
  }
}
