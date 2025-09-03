import { Injectable } from '@nestjs/common';
import { S3Client, HeadBucketCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as fs from 'fs';
import * as path from 'path';
import { WsEmitterService } from '../real-time/ws-emitter.service';
import { StorageProvidersCodes } from 'src/common/types/storage-providers-codes';
import { StorjUploadResult } from 'src/common/types/upload-result';
import {
  ConnectionTestResult,
  UploadProvider,
} from 'src/common/types/upload-provider.interface';
import {
  StreamingProvider,
  StreamingOptions,
  StreamingResult,
} from 'src/common/types/streaming-provider.interface';
import { StorjConfig } from './types/storj-config.interface';

@Injectable()
export class StorjService implements UploadProvider<StorjConfig>, StreamingProvider {
  constructor(private wsEmitter: WsEmitterService) {}

  private createS3Client(config: StorjConfig): S3Client {
    return new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint || 'https://gateway.storjshare.io',
      region: config.region || 'us1',
      forcePathStyle: true,
    });
  }

  async testConnection(config: StorjConfig): Promise<ConnectionTestResult> {
    try {
      const s3Client = this.createS3Client(config);

      await s3Client.send(new HeadBucketCommand({ Bucket: config.bucket }));

      return {
        isHealthy: true,
      };
    } catch (error) {
      console.log(error)
      let errorMessage = 'Unknown error';

      if (error.name === 'NoSuchBucket') {
        errorMessage = `Bucket '${config.bucket}' does not exist`;
      } else if (error.name === 'InvalidAccessKeyId') {
        errorMessage = 'Invalid access key ID';
      } else if (error.name === 'SignatureDoesNotMatch') {
        errorMessage = 'Invalid secret access key';
      } else if (
        error.name === 'NetworkingError' ||
        error.code === 'ENOTFOUND'
      ) {
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
  }): Promise<StorjUploadResult> {
    const s3Client = this.createS3Client(providerConfig);
    const fileStream = fs.createReadStream(filePath);
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    const key = `${folderName}/${originalName}`;

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: providerConfig.bucket,
        Key: key,
        Body: fileStream,
        ContentType: this.getContentType(originalName),
      },
      partSize: 64 * 1024 * 1024,
      queueSize: 4,
    });

    let lastProgress = 0;
    upload.on('httpUploadProgress', (progress) => {
      if (progress.loaded && progress.total) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        if (percent !== lastProgress) {
          lastProgress = percent;
          console.log(
            `[Upload] ${StorageProvidersCodes.STORJ} ${fileId}: ${percent}%`,
          );
        }
      }
    });

    const result = await upload.done();

    const publicUrl = `${providerConfig.endpoint || 'https://gateway.storjshare.io'}/${providerConfig.bucket}/${key}`;

    return {
      providerCode: StorageProvidersCodes.STORJ,
      providerId,
      thumbnail: '',
      url: publicUrl,
      metadata: {
        bucket: providerConfig.bucket,
        key: key,
        size: fileSize,
        etag: result.ETag,
        location: result.Location,
        thumbnail: '',
      },
    };
  }

  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.avi': 'video/avi',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  canStream(providerCode: string): boolean {
    return providerCode === StorageProvidersCodes.STORJ;
  }

  async getStream({
    providerConfig,
    metadata,
    streamingOptions = {},
  }: {
    providerConfig: StorjConfig;
    metadata: Record<string, any>;
    streamingOptions?: StreamingOptions;
  }): Promise<StreamingResult> {
    const s3Client = this.createS3Client(providerConfig);
    
    const command = new GetObjectCommand({
      Bucket: providerConfig.bucket,
      Key: metadata.key,
      Range: streamingOptions.range,
    });

    const response = await s3Client.send(command);
    
    let statusCode = 200;
    let contentRange: string | undefined;
    
    if (streamingOptions.range && response.ContentRange) {
      statusCode = 206;
      contentRange = response.ContentRange;
    }

    return {
      stream: response.Body as any,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength,
      acceptRanges: true,
      contentRange,
      statusCode,
    };
  }

  async delete({
    providerId,
    providerConfig,
    metadata,
  }: {
    providerId: string;
    providerConfig: StorjConfig;
    metadata: Record<string, any>;
  }): Promise<{ success: boolean; error?: string }> {
    const { bucket } = providerConfig;
    const key = metadata.key; // El key/path del archivo en Storj

    if (!key) {
      return { success: false, error: 'File key not found in metadata' };
    }

    try {
      console.log(`[Storj] Deleting file ${key} from bucket ${bucket}`);

      const s3Client = this.createS3Client(providerConfig);
      
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await s3Client.send(command);

      console.log(`[Storj] File ${key} deleted successfully`);
      return { success: true };

    } catch (error) {
      console.error(`[Storj] Delete failed for ${key}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      };
    }
  }
}
