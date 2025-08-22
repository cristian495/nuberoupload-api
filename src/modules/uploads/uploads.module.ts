import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { RealTimeModule } from '../real-time/real-time.module';
import { FilesModule } from '../files/files.module';
import { StorageProvidersModule } from '../storage-providers/storage-providers.module';
import { ProviderRegistryModule } from '../provider-registry/provider-registry.module';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [
    RealTimeModule,
    FilesModule,
    StorageProvidersModule,
    ProviderRegistryModule,
    EncryptionModule,
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
