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
import { UploadFileDto } from './dto/upload-file.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('file')
  @UseInterceptors(
    FilesInterceptor('file', undefined, {
      storage: diskStorage({ destination: './multer-uploads' }),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB por archivo
    }),
  )
  async uploadFile(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadFileDto,
  ) {
    const userId = 'exampleId';

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    const { uploadId, folderName, providerIds } = body;
    const uploadedFile = files[0];

    // Validar que el uploadId no exista ya
    const uploadExists = await this.uploadsService.checkUploadIdExists(uploadId);
    if (uploadExists) {
      throw new BadRequestException(`Upload with ID '${uploadId}' already exists`);
    }

    // 1. Save file temporarily to local storage
    const temporaryFilePath = await this.uploadsService.saveFileTemporarily(
      uploadedFile,
      uploadId,
    );

    // 2. Create file record in database
    const fileRecord = await this.uploadsService.createFileRecord(
      uploadId,
      uploadedFile.originalname,
      folderName,
    );

    // 3. Process file to storage providers asynchronously
    setImmediate(() => {
      this.uploadsService.uploadToStorageProviders({
        filePath: temporaryFilePath,
        uploadId,
        providerIds,
        userId,
        fileCategory: fileRecord.file.category,
      });
    });

    return {
      success: true,
      file: fileRecord.file,
      folder: fileRecord.folder,
    };
  }
}
