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
import { UploadFactory } from './upload-factory.service';
import { RuntimeProviderCredentials } from 'src/common/interfaces/provider-operations.interface';

interface UploadToProvidersOptions {
  filePath: string;
  fileId: string;
  providerIds: string[];
  userId: string;
  fileCategory: FileCategory;
  providerCredentials?: RuntimeProviderCredentials[]; // For RUNTIME mode
}

interface DeleteFromProvidersOptions {
  fileId: string;
  userId: string;
  uploads: UploadResult[];
  providerCredentials?: RuntimeProviderCredentials[]; // For RUNTIME mode - required for RUNTIME providers
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
    private uploadFactory: UploadFactory,
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
    const { filePath, fileId, providerIds, userId, fileCategory, providerCredentials } = options;

    const configuredProviders = await this.findUserStorageProviders(
      providerIds,
      userId,
    );

    // Crear mapa de credenciales runtime si están disponibles
    const credentialsMap = providerCredentials
      ? new Map(
          providerCredentials.map((pc) => [pc.providerId, pc.credentials])
        )
      : new Map();

    // Obtener información del archivo (carpeta) una sola vez
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

    // Procesar uploads en paralelo
    const uploadPromises = configuredProviders.map(async (provider) => {
      const { _id, name, configSource } = provider;
      const providerId = _id.toString();

      try {
        // ✅ USAR FACTORY para validar
        if (!this.uploadFactory.validateProvider(provider, fileCategory)) {
          throw new Error(
            `Provider '${name}' does not support '${fileCategory}' files`,
          );
        }

        this.notifyUploadProgress({
          fileId,
          providerId,
          status: 'starting',
        });

        const runtimeCredentials = credentialsMap.get(providerId);

        // ✅ DELEGAR A STRATEGY via Factory
        const result = await this.uploadFactory.processUpload(configSource, {
          provider,
          filePath,
          fileId,
          folderName,
          runtimeCredentials,
        });

        if (result.success && result.url) {
          // Guardar resultado en DB
          await this.filesService.addUploadResult(fileId, {
            providerCode: result.providerCode,
            providerId: result.providerId,
            url: result.url,
            thumbnail: '', // TODO: Get from provider result
            metadata: {}, // TODO: Get from provider result
          });
        }

        this.notifyUploadProgress({
          fileId,
          providerId,
          status: result.success ? 'completed' : 'error',
          url: result.url,
          error: result.error,
        });
      } catch (error) {
        console.error(`Upload failed for provider ${name}:`, error);
        this.notifyUploadProgress({
          fileId,
          providerId,
          status: 'error',
          error: error.message,
        });
      }
    });

    // Ejecutar todas las subidas en paralelo
    await Promise.allSettled(uploadPromises);
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

  private notifyUploadProgress(data: UploadProgressData): void {
    this.wsEmitter.emit('upload-progress', data);
  }

  // 🎯 ELIMINACIÓN DE ARCHIVOS
  async deleteFromAllProviders(
    options: DeleteFromProvidersOptions,
  ): Promise<void> {
    const { fileId, userId, uploads, providerCredentials } = options;

    console.log(
      `[Delete] Starting deletion for file ${fileId} from ${uploads.length} providers`,
    );

    // Crear mapa de credenciales runtime si están disponibles
    const credentialsMap = providerCredentials
      ? new Map(
          providerCredentials.map((pc) => [pc.providerId, pc.credentials]),
        )
      : new Map();

    // Procesar eliminaciones en paralelo
    const deletePromises = uploads.map(async (upload) => {
      const { providerCode, providerId, metadata } = upload;

      try {
        this.notifyDeletionProgress({
          fileId,
          provider: providerCode,
          providerId,
          status: 'starting',
        });

        // Obtener el proveedor de la BD
        const storageProvider =
          await this.storageProvService.findById(providerId);
        if (!storageProvider) {
          throw new Error(`Storage provider not found: ${providerId}`);
        }

        const runtimeCredentials = credentialsMap.get(providerId);

        // ✅ DELEGAR A STRATEGY via Factory
        const result = await this.uploadFactory.processDelete(
          storageProvider.configSource,
          {
            provider: storageProvider,
            metadata,
            runtimeCredentials,
          },
        );

        if (!result.success) {
          throw new Error(result.error || 'Delete operation failed');
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
    });

    // Ejecutar todas las eliminaciones en paralelo
    await Promise.allSettled(deletePromises);
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
