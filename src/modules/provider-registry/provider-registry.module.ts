import { Module } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service';
import { DoodstreamModule } from '../doodstream/doodstream.module';

@Module({
  imports: [DoodstreamModule],
  providers: [ProviderRegistryService],
  exports: [ProviderRegistryService],
})
export class ProviderRegistryModule {}