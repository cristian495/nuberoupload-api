import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { DoodstreamService } from '../doodstream/doodstream.service';
import { WsEmitterService } from '../real-time/ws-emitter.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class UploadsService {
  private readonly uploadRoot = path.join(process.cwd(), 'temp', 'uploads');

  constructor(
    private doodstreamService: DoodstreamService,
    private wsEmitter: WsEmitterService,
    private mediaService: MediaService,
  ) {}

  private getFileType(fileName: string): 'image' | 'video' {
    const ext = path.extname(fileName).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext))
      return 'image';
    if (['.mp4', '.mkv', '.avi', '.mov'].includes(ext)) return 'video';
    throw new Error('unknown file type');
  }

  async registerMediaItem(
    uploadId: string,
    originalName: string,
    folderName: string,
  ) {
    const type = this.getFileType(originalName); // tu lógica
    return this.mediaService.saveFile(uploadId, originalName, folderName, type);
  }

  async saveFile(file: Express.Multer.File, uploadId: string): Promise<string> {
    // Creamos el directorio para este uploadId
    const uploadDir = path.join(this.uploadRoot, uploadId);
    await fs.promises.mkdir(uploadDir, { recursive: true });

    // Nombre y ruta final del archivo
    const filePath = path.join(uploadDir, file.originalname);

    // Si Multer está en memoria, file.buffer; si en disco, file.path
    if (file.buffer) {
      await fs.promises.writeFile(filePath, file.buffer);
    } else if (file.path) {
      // await fs.promises.copyFile(file.path, filePath);
      await fs.promises.rename(file.path, filePath);
    } else {
      throw new Error('No se encontró el contenido del archivo');
    }

    return filePath;
  }

  async processToProviders(filePath: string, uploadId: string) {
    const providers = [
      {
        name: 'doodstream',
        fn: this.doodstreamService.upload.bind(this.doodstreamService),
      },
    ];

    let hasSuccess = false;

    for (const { name, fn } of providers) {
      this.wsEmitter.emit('upload-progress', {
        uploadId,
        provider: name,
        status: 'starting',
      });

      try {
        const result = await fn({
          filePath,
          originalName: path.basename(filePath),
          uploadId,
        });

        await this.mediaService.addProviderLink(
          uploadId,
          name,
          result.url,
          result.metadata?.thumbnail,
        );

        hasSuccess = true;

        this.wsEmitter.emit('upload-progress', {
          uploadId,
          provider: name,
          status: 'completed',
          url: result.url,
        });
      } catch (err) {
        this.wsEmitter.emit('upload-progress', {
          uploadId,
          provider: name,
          status: 'error',
          error: err.message,
        });
      }
    }

    if (!hasSuccess) {
      await this.mediaService.markUploadFailed(
        uploadId,
        'Todos los proveedores fallaron',
      );
    }
  }
}
