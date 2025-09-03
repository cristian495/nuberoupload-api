import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FileItem, FileItemSchema } from './schemas/file-item.schema';
import { Folder, FolderSchema } from './schemas/folder.schema';
import { StreamingModule } from '../streaming/streaming.module';
import { StorageProvidersModule } from '../storage-providers/storage-providers.module';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileItem.name, schema: FileItemSchema },
      { name: Folder.name, schema: FolderSchema },
    ]),
    StreamingModule,
    StorageProvidersModule,
    EncryptionModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
