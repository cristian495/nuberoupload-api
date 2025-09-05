import { Injectable } from '@nestjs/common';
import { StreamingProvider } from 'src/common/types/streaming-provider.interface';
import { StorjService } from '../storj/storj.service';
import { DoodstreamService } from '../doodstream/doodstream.service';

@Injectable()
export class StreamingFactoryService {
  private providers: StreamingProvider[] = [];

  constructor(
    private storjService: StorjService,
  ) {
    this.providers = [
      this.storjService,
    ];
  }

  getStreamingProvider(providerCode: string): StreamingProvider | null {
    return this.providers.find(provider => provider.canStream(providerCode)) || null;
  }

  canProviderStream(providerCode: string): boolean {
    return this.providers.some(provider => provider.canStream(providerCode));
  }
}