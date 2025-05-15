import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { diskStorage } from 'multer';
import { UploadMediaDto } from './dto/upload-media.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('media')
  @UseInterceptors(
    FilesInterceptor('file', undefined, {
      storage: diskStorage({ destination: './multer-uploads' }),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB por archivo
    }),
  )
  async uploadMedia(
    @UploadedFiles() file: Express.Multer.File[],
    @Body() body: UploadMediaDto,
  ) {
    if (!file) {
      throw new BadRequestException('Al menos un archivo es requerido');
    }

    const { uploadId, folderName } = body;

    // guarda el archivo en disco
    const savedPath = await this.uploadsService.saveFile(file[0], uploadId);

    // registra en BD
    const media = await this.uploadsService.registerMediaItem(
      uploadId,
      file[0].originalname,
      folderName,
    );

    setImmediate(() => {
      this.uploadsService.processToProviders(savedPath, uploadId);
    });

    return { success: true, media };
  }
}
