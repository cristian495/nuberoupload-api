import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Delete,
  Param,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { diskStorage } from 'multer';
import { UploadFileDto } from './dto/upload-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('file')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('file', undefined, {
      storage: diskStorage({ destination: './multer-uploads' }),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB por archivo
    }),
  )
  async uploadFile(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadFileDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const userId = user._id.toString();

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    const { folderName, providerIds } = body;
    const uploadedFile = files[0];

    const validUserProviderIds =
      await this.uploadsService.findUserStorageProviders(providerIds, userId);
    if (validUserProviderIds.length === 0) {
      throw new BadRequestException(
        'No valid storage providers found for user',
      );
    }

    // 1. Create file record in database first
    const fileRecord = await this.uploadsService.createFileRecord(
      userId,
      uploadedFile.originalname,
      folderName,
    );

    const fileId = fileRecord.file._id.toString();

    // 2. Save file temporarily to local storage
    const temporaryFilePath = await this.uploadsService.saveFileTemporarily(
      uploadedFile,
      fileId,
    );

    // 3. Process file to storage providers asynchronously
    setTimeout(() => {
      this.uploadsService.uploadToStorageProviders({
        filePath: temporaryFilePath,
        fileId,
        providerIds,
        userId,
        fileCategory: fileRecord.file.category,
      });
    }, 2000);

    return {
      success: true,
      fileId, // ✅ Cliente recibe fileId para tracking
      file: fileRecord.file,
      folder: fileRecord.folder,
    };
  }

  @Delete(':fileId')
  @UseGuards(JwtAuthGuard)
  async deleteFile(
    @Param('fileId') fileId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    const userId = user._id.toString();

    // 1. Verificar que el archivo existe y pertenece al usuario
    const file = await this.uploadsService.getFileById(fileId);
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    if (file.userId.toString() !== userId) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar este archivo',
      );
    }

    if (file.uploads.length === 0) {
      throw new BadRequestException(
        'El archivo no tiene uploads para eliminar',
      );
    }

    // 2. Iniciar eliminación en background de todos los providers
    setImmediate(() => {
      this.uploadsService.deleteFromAllProviders({
        fileId,
        userId,
        uploads: file.uploads,
      });
    });

    return {
      success: true,
      message: 'Eliminación iniciada, recibirás notificaciones del progreso',
      fileId,
    };
  }
}
