import { Controller, Get, Param, Query } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('upload-id')
  generateUploadId() {
    return this.mediaService.createUploadId();
  }

  @Get('folders')
  async getFolders() {
    return this.mediaService.listFolders();
  }

  @Get('folders/:id')
  async getFolderContent(@Param('id') folderId: string) {
    return this.mediaService.getFolderById(folderId);
  }

  @Get('folders/:id/files')
  async getFolderFiles(
    @Param('id') folderId: string,
    @Query('type') type?: 'video' | 'image',
  ) {
    return this.mediaService.getFolderFiles(folderId, type);
  }
}
