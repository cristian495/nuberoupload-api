import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProviderTemplatesController } from './provider-templates.controller';
import { ProviderTemplatesService } from './provider-templates.service';
import {
  ProviderTemplate,
  ProviderTemplateSchema,
} from './schemas/provider-template.schema';
import { ProviderRegistryModule } from '../provider-registry/provider-registry.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProviderTemplate.name, schema: ProviderTemplateSchema },
    ]),
    ProviderRegistryModule,
  ],
  controllers: [ProviderTemplatesController],
  providers: [ProviderTemplatesService],
  exports: [ProviderTemplatesService],
})
export class ProviderTemplatesModule {}