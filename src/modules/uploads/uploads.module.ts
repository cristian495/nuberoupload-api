import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { RealTimeModule } from '../real-time/real-time.module';
import { FilesModule } from '../files/files.module';
import { StorageProvidersModule } from '../storage-providers/storage-providers.module';
import { ProviderRegistryModule } from '../provider-registry/provider-registry.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { ProviderConfigModule } from '../provider-config/provider-config.module';
import { UploadFactory } from './upload-factory.service';
import { DatabaseUploadStrategy } from './strategies/database-upload.strategy';
import { RuntimeUploadStrategy } from './strategies/runtime-upload.strategy';

@Module({
  imports: [
    RealTimeModule,
    FilesModule,
    StorageProvidersModule,
    ProviderRegistryModule,
    EncryptionModule,
    ProviderConfigModule,
  ],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    UploadFactory,
    DatabaseUploadStrategy,
    RuntimeUploadStrategy,
  ],
})
export class UploadsModule {}
