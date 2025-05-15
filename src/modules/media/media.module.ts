import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaItem, MediaItemSchema } from './schemas/media-item.schema';
import { MediaFolder, MediaFolderSchema } from './schemas/media-folder.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MediaItem.name, schema: MediaItemSchema },
      { name: MediaFolder.name, schema: MediaFolderSchema },
    ]),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
