import { Module } from '@nestjs/common';
import { StorjService } from './storj.service';
import { RealTimeModule } from '../real-time/real-time.module';

@Module({
  imports: [RealTimeModule],
  providers: [StorjService],
  exports: [StorjService],
})
export class StorjModule {}
