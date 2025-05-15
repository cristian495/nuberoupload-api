import { Module } from '@nestjs/common';
import { DoodstreamService } from './doodstream.service';
import { RealTimeModule } from '../real-time/real-time.module';

@Module({
  imports: [RealTimeModule],
  providers: [DoodstreamService],
  exports: [DoodstreamService],
})
export class DoodstreamModule {}
