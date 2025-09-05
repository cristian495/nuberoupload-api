import { Module } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { DoodstreamModule } from '../doodstream/doodstream.module';
import { StorjModule } from '../storj/storj.module';

@Module({
  imports: [DoodstreamModule, StorjModule],
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
})
export class ProviderRegistryModule {}
