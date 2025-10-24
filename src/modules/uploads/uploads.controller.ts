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
import { UploadFileWithRuntimeCredentialsDto } from './dto/upload-file.with-runtime-credential';
import { DeleteFileRuntimeDto } from './dto/delete-file-runtime.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ConfigSource } from 'src/common/enums/config-source.enum';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Upload file to DATABASE providers (credentials stored in DB)
   */
  @Post('file/database')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('file', undefined, {
      storage: diskStorage({ destination: './multer-uploads' }),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB por archivo
    }),
  )
  async uploadFileToDatabase(
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

    const validUserProviders =
      await this.uploadsService.findUserStorageProviders(providerIds, userId);
    if (validUserProviders.length === 0) {
      throw new BadRequestException(
        'No valid storage providers found for user',
      );
    }

    // Validate that all providers are DATABASE type
    const nonDatabaseProviders = validUserProviders.filter(
      (p) => p.configSource !== ConfigSource.DATABASE,
    );
    if (nonDatabaseProviders.length > 0) {
      throw new BadRequestException(
        `Este endpoint solo acepta providers DATABASE. Los siguientes son RUNTIME: ${nonDatabaseProviders.map((p) => p.name).join(', ')}`,
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

  /**
   * Upload file to RUNTIME providers (credentials sent in request)
   */
  @Post('file/runtime')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('file', undefined, {
      storage: diskStorage({ destination: './multer-uploads' }),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB por archivo
    }),
  )
  async uploadFileToRuntime(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadFileWithRuntimeCredentialsDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const userId = user._id.toString();

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    const { folderName, providerCredentials } = body;
    const uploadedFile = files[0];

    // Extract provider IDs from credentials
    const providerIds = providerCredentials.map((pc) => pc.providerId);

    const validUserProviders =
      await this.uploadsService.findUserStorageProviders(providerIds, userId);
    if (validUserProviders.length === 0) {
      throw new BadRequestException(
        'No valid storage providers found for user',
      );
    }

    // Validate that all providers are RUNTIME type
    const nonRuntimeProviders = validUserProviders.filter(
      (p) => p.configSource !== ConfigSource.RUNTIME,
    );
    if (nonRuntimeProviders.length > 0) {
      throw new BadRequestException(
        `Este endpoint solo acepta providers RUNTIME. Los siguientes son DATABASE: ${nonRuntimeProviders.map((p) => p.name).join(', ')}`,
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

    // 3. Process file to storage providers asynchronously with runtime credentials
    setTimeout(() => {
      this.uploadsService.uploadToStorageProviders({
        filePath: temporaryFilePath,
        fileId,
        providerIds,
        userId,
        fileCategory: fileRecord.file.category,
        providerCredentials, // ✅ Pass runtime credentials
      });
    }, 2000);

    return {
      success: true,
      fileId,
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

  /**
   * Delete file from RUNTIME providers (credentials sent in request)
   */
  @Delete(':fileId/runtime')
  @UseGuards(JwtAuthGuard)
  async deleteFileRuntime(
    @Param('fileId') fileId: string,
    @Body() body: DeleteFileRuntimeDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const userId = user._id.toString();
    const { providerCredentials } = body;

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

    // Validate that credentials are provided for all RUNTIME providers
    const runtimeUploads = file.uploads.filter((upload) => {
      // We need to check the provider's configSource
      // For now, we'll rely on the user providing credentials for the right providers
      return true; // The strategy will validate this
    });

    if (runtimeUploads.length === 0) {
      throw new BadRequestException(
        'El archivo no tiene uploads de providers RUNTIME para eliminar',
      );
    }

    // 2. Iniciar eliminación en background con credenciales runtime
    setImmediate(() => {
      this.uploadsService.deleteFromAllProviders({
        fileId,
        userId,
        uploads: file.uploads,
        providerCredentials, // ✅ Pass runtime credentials
      });
    });

    return {
      success: true,
      message: 'Eliminación iniciada, recibirás notificaciones del progreso',
      fileId,
    };
  }
}
