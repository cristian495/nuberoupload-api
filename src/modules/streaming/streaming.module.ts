import { Module } from '@nestjs/common';
import { StreamingFactoryService } from './streaming-factory.service';
import { StorjModule } from '../storj/storj.module';

@Module({
  imports: [StorjModule],
  providers: [StreamingFactoryService],
  exports: [StreamingFactoryService],
})
export class StreamingModule {}