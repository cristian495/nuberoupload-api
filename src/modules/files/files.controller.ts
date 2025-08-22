import { Controller, Get, Param, Query } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileCategory } from 'src/common/constants/file-extensions';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('upload-id')
  generateUploadId() {
    return this.filesService.generateUniqueUploadId();
  }

  @Get('folders')
  async getFolders() {
    return this.filesService.getAllFoldersWithStats();
  }

  @Get('folders/:id')
  async getFolderContent(@Param('id') folderId: string) {
    return this.filesService.getFolderDetailsById(folderId);
  }

  @Get('folders/:id/files')
  async getFolderFiles(
    @Param('id') folderId: string,
    @Query('type') type?: FileCategory,
  ) {
    return this.filesService.getFilesInFolder(folderId, type);
  }
}
