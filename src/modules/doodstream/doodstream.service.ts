import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import ProgressStream from 'progress-stream';
import { WsEmitterService } from '../real-time/ws-emitter.service';
import { StorageProvidersCodes } from 'src/common/types/storage-providers-codes';
import got from 'got';

import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { uploadWithProgress } from 'src/common/helpers/upload-with-progress.util';
import { DoodstreamConfig as DoodstreamConfigType } from './types/doodstream-config.interface';
import { UploadResult } from 'src/common/types/upload-result';
import {
  ConnectionTestResult,
  UploadProvider,
} from 'src/common/types/upload-provider.interface';

export interface DoodstreamUploadResponse {
  status: number;
  msg: string;
  server_time: string;

  result: {
    download_url: string;
    single_img: string;
    status: number;
    filecode: string;
    splash_img: string;
    canplay: string;
    size: string;
    length: string;
    uploaded: string;
    protected_embed: string;
    protected_dl: string;
    title: string;
  }[];
}
export interface DoodstreamGetUploadUrlResponse {
  msg: string;
  server_time: string;
  status: number;
  result: string;
}

@Injectable()
export class DoodstreamService implements UploadProvider<DoodstreamConfigType> {
  private readonly logger = new Logger(DoodstreamService.name);

  constructor(private wsEmitter: WsEmitterService) {}
  async delete(options: {
    providerId: string;
    providerConfig: DoodstreamConfigType;
    metadata: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    const apiKey = options.providerConfig.apiKey;
    const filecode = options.metadata.filecode;

    if (!filecode) {
      return { success: false, error: 'Filecode not found in metadata' };
    }

    try {
      this.logger.log(`Moving file ${filecode} to trash folder`);

      // Primero, asegurarse de que existe una carpeta "trash"
      const trashFolderId = await this.ensureTrashFolderExists(apiKey);

      // Mover el archivo a la carpeta trash
      const response = await got.get('https://doodapi.com/api/file/move', {
        searchParams: {
          key: apiKey,
          file_code: filecode,
          fld_id: trashFolderId,
        },
      });

      const result = JSON.parse(response.body);

      if (result.status !== 200) {
        return {
          success: false,
          error: result.msg || 'Unknown error from Doodstream API',
        };
      }

      this.logger.log(`🗑️ Archivo movido a papelera: ${filecode}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `❌ Error al mover archivo ${filecode} a papelera: ${error instanceof Error ? error.message : error}`,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Move to trash failed',
      };
    }
  }

  private async ensureTrashFolderExists(apiKey: string): Promise<string> {
    try {
      // Obtener lista de carpetas para buscar si ya existe "trash"
      const foldersResponse = await got.get(
        `https://doodapi.com/api/folder/list?key=${apiKey}`,
      );
      const foldersResult = JSON.parse(foldersResponse.body);

      if (foldersResult.status === 200 && foldersResult.result) {
        this.logger.debug('Folders list retrieved successfully', {
          folderCount: foldersResult.result.folders?.length || 0,
        });
        // Buscar carpeta "trash" existente
        const trashFolder = foldersResult.result.folders.find(
          (folder: any) =>
            folder.name.toLowerCase() === 'trash' ||
            folder.name.toLowerCase() === 'papelera',
        );

        if (trashFolder) {
          this.logger.log(`🗑️ Carpeta de papelera encontrada`);
          return trashFolder.fld_id;
        }
      }

      // Si no existe, crear carpeta "trash"
      const createResponse = await got.get(
        `https://doodapi.com/api/folder/create`,
        {
          searchParams: {
            key: apiKey,
            name: 'trash',
            parent_id: 0, // Raíz
          },
        },
      );

      this.logger.debug('Trash folder creation response received', {
        status: createResponse.statusCode,
      });

      const createResult = JSON.parse(createResponse.body);

      if (createResult.status === 200 && createResult.result?.fld_id) {
        this.logger.log(`🗑️ Carpeta de papelera creada exitosamente`);
        return createResult.result.fld_id;
      }

      throw new Error('Failed to create trash folder');
    } catch (error) {
      this.logger.error(
        `❌ Error gestionando carpeta de papelera: ${error instanceof Error ? error.message : error}`,
      );
      // Fallback: usar carpeta raíz (ID 0)
      return '0';
    }
  }

  private async ensureFolderExists(
    apiKey: string,
    folderName: string,
  ): Promise<string> {
    try {
      // Obtener lista de carpetas para buscar si ya existe la carpeta
      const foldersResponse = await got.get(
        `https://doodapi.com/api/folder/list?key=${apiKey}`,
      );
      const foldersResult = JSON.parse(foldersResponse.body);

      if (foldersResult.status === 200 && foldersResult.result?.folders) {
        // Buscar carpeta existente con el nombre dado
        const existingFolder = foldersResult.result.folders.find(
          (folder: any) => folder.name === folderName,
        );

        if (existingFolder) {
          this.logger.log(`📂 Carpeta encontrada: '${folderName}'`);
          return existingFolder.fld_id;
        }
      }

      // Si no existe, crear la carpeta
      const createResponse = await got.get(
        `https://doodapi.com/api/folder/create`,
        {
          searchParams: {
            key: apiKey,
            name: folderName,
            parent_id: 0, // Raíz
          },
        },
      );

      const createResult = JSON.parse(createResponse.body);

      if (createResult.status === 200 && createResult.result?.fld_id) {
        this.logger.log(`📁 Nueva carpeta creada: '${folderName}'`);
        return createResult.result.fld_id;
      }

      throw new Error(`Failed to create folder: ${folderName}`);
    } catch (error) {
      this.logger.error(
        `❌ Error gestionando carpeta '${folderName}': ${error instanceof Error ? error.message : error}`,
      );
      // Fallback: usar carpeta raíz (ID 0)
      return '0';
    }
  }
  async testConnection(
    config: DoodstreamConfigType,
  ): Promise<ConnectionTestResult> {
    try {
      // Este es un endpoint ligero que requiere autenticación válida
      const response = await got
        .get(`https://doodapi.co/api/upload/server?key=${config.apiKey}`, {
          timeout: { request: 10000 }, // 10 segundos de timeout
        })
        .json<DoodstreamGetUploadUrlResponse>();

      // Verificar que la respuesta sea válida
      if (response.status === 200 && response.result) {
        return {
          isHealthy: true,
        };
      } else {
        return {
          isHealthy: false,
          error: `API returned status ${response.status}: ${response.msg}`,
        };
      }
    } catch (error) {
      let errorMessage = 'Unknown error';

      if (error.response?.statusCode === 401) {
        errorMessage = 'Invalid API key';
      } else if (error.response?.statusCode === 403) {
        errorMessage = 'API access forbidden';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Network connection failed';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        isHealthy: false,
        error: errorMessage,
      };
    }
  }

  async upload({
    providerId,
    providerConfig,
    filePath,
    originalName,
    fileId,
    folderName,
  }): Promise<UploadResult> {
    const apiKey = providerConfig.apiKey;

    // Asegurar que la carpeta exista y obtener su ID
    const folderId = await this.ensureFolderExists(apiKey, folderName);
    this.logger.log(`📁 Carpeta de destino: '${folderName}' (ID: ${folderId})`);

    const serverRes = await got
      .get(`https://doodapi.co/api/upload/server?key=${apiKey}`)
      .json<DoodstreamGetUploadUrlResponse>();
    const uploadUrl = serverRes.result;

    const uploadFields = {
      api_key: apiKey,
      fld_id: folderId,
    };

    this.logger.debug(`Uploading file '${originalName}' to Doodstream`);
    const res = await uploadWithProgress({
      url: uploadUrl,
      filePath,
      originalName,
      fields: uploadFields,
      fileId,
      providerId,
      io: this.wsEmitter,
      provider: StorageProvidersCodes.DOODSTREAM,
      logger: this.logger,
    });

    const result = res.raw?.result?.[0];
    if (!result || !result.filecode) {
      this.logger.error(
        `❌ Error: No se recibió código de archivo válido de Doodstream para '${originalName}'`,
      );
      throw new Error('No se recibió filecode válido de Doodstream');
    }

    this.logger.log(
      `🎉 Subida exitosa: '${originalName}' → Doodstream (${result.filecode})`,
    );

    return {
      providerCode: StorageProvidersCodes.DOODSTREAM,
      providerId,
      thumbnail: result.splash_img,
      url: `https://dood.to/e/${result.filecode}`,
      metadata: {
        filecode: result.filecode,
        thumbnail: result.splash_img,
        size: Number(result.size),
        title: result.title,
        folderId,
        folderName,
      },
    };
  }
}
