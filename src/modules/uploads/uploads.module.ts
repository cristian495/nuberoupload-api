import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { RealTimeModule } from '../real-time/real-time.module';
import { DoodstreamModule } from '../doodstream/doodstream.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [RealTimeModule, DoodstreamModule, MediaModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
