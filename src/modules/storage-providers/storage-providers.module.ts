import { Module } from '@nestjs/common';
import { StorageProvidersController } from './storage-providers.controller';
import { StorageProvidersService } from './storage-providers.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StorageProvider,
  StorageProviderSchema,
} from './schemas/storage-provider.schema';
import { FileItem, FileItemSchema } from '../files/schemas/file-item.schema';
import { EncryptionModule } from '../encryption/encryption.module';
import { ProviderTemplatesModule } from '../provider-templates/provider-templates.module';
import { ProviderRegistryModule } from '../provider-registry/provider-registry.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StorageProvider.name, schema: StorageProviderSchema },
      { name: FileItem.name, schema: FileItemSchema },
    ]),
    EncryptionModule,
    ProviderTemplatesModule,
    ProviderRegistryModule,
  ],
  controllers: [StorageProvidersController],
  providers: [StorageProvidersService],
  exports: [MongooseModule, StorageProvidersService],
})
export class StorageProvidersModule {}
