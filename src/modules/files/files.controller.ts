import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Req,
  Res,
  Headers,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FilesService } from './files.service';
import { FileCategory } from 'src/common/constants/file-extensions';
import { StreamingFactoryService } from '../streaming/streaming-factory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly streamingFactory: StreamingFactoryService,
  ) {}

  @Get('folders')
  async getFolders() {
    return this.filesService.getAllFoldersWithStats();
  }

  // @Get('folders/:id')
  // async getFolderContent(@Param('id') folderId: string) {
  //   return this.filesService.getFolderDetailsById(folderId);
  // }

  @Get('folders/:id/')
  async getFolderFiles(
    @Param('id') folderId: string,
    @Query('type') type?: FileCategory,
  ) {
    return this.filesService.getFilesInFolder(folderId, type);
  }

  @Get(':id/stream')
  @UseGuards(JwtAuthGuard)
  async streamFile(
    @Param('id') fileId: string,
    @Query('provider') providerId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('range') range?: string,
  ) {
    // 1. Obtener archivo y verificar permisos
    const file = await this.filesService.getFileById(fileId);
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // 2. Verificar que el usuario tiene acceso al archivo
    const user = req.user as any;
    if (file.userId !== user.id) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este archivo',
      );
    }

    // 3. Encontrar el upload específico del proveedor
    const upload = file.uploads.find((u) => u.providerId === providerId);
    if (!upload) {
      throw new NotFoundException('Upload no encontrado para este proveedor');
    }

    // 4. Verificar que el proveedor soporta streaming
    const streamingProvider = this.streamingFactory.getStreamingProvider(
      upload.providerCode,
    );
    if (!streamingProvider) {
      throw new ForbiddenException(
        'Este proveedor no soporta streaming directo',
      );
    }

    try {
      // 5. Obtener configuración del proveedor del usuario
      const providerConfig = await this.filesService.getProviderConfig(
        upload.providerId,
      );

      // 6. Obtener stream del proveedor
      const streamResult = await streamingProvider.getStream({
        providerConfig,
        metadata: upload.metadata,
        streamingOptions: { range, userId: user.id },
      });

      // 7. Configurar headers de respuesta
      res.status(streamResult.statusCode);
      res.set({
        'Content-Type': streamResult.contentType,
        'Accept-Ranges': streamResult.acceptRanges ? 'bytes' : 'none',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      });

      if (streamResult.contentLength) {
        res.set('Content-Length', streamResult.contentLength.toString());
      }

      if (streamResult.contentRange) {
        res.set('Content-Range', streamResult.contentRange);
      }

      // 8. Stream el contenido
      streamResult.stream.pipe(res);
    } catch (error) {
      console.error('Error streaming file:', error);
      throw new ForbiddenException('Error accediendo al archivo');
    }
  }
}
