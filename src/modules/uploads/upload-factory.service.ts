import { Injectable } from '@nestjs/common';
import { ConfigSource } from 'src/common/enums/config-source.enum';
import {
  UploadStrategy,
  UploadProviderData,
  UploadResult,
  DeleteProviderData,
  DeleteResult,
} from './strategies/upload-strategy.interface';
import { DatabaseUploadStrategy } from './strategies/database-upload.strategy';
import { RuntimeUploadStrategy } from './strategies/runtime-upload.strategy';
import { StorageProvider } from '../storage-providers/schemas/storage-provider.schema';
import { FileCategory } from 'src/common/constants/file-extensions';

@Injectable()
export class UploadFactory {
  private readonly strategies = new Map<ConfigSource, UploadStrategy>();

  constructor(
    private databaseStrategy: DatabaseUploadStrategy,
    private runtimeStrategy: RuntimeUploadStrategy,
  ) {
    this.strategies.set(ConfigSource.DATABASE, this.databaseStrategy);
    this.strategies.set(ConfigSource.RUNTIME, this.runtimeStrategy);
  }

  private getStrategy(configSource: ConfigSource): UploadStrategy {
    const strategy = this.strategies.get(configSource);
    if (!strategy) {
      throw new Error(`Strategy not found for config source: ${configSource}`);
    }
    return strategy;
  }

  async processUpload(
    configSource: ConfigSource,
    data: UploadProviderData,
  ): Promise<UploadResult> {
    const strategy = this.getStrategy(configSource);
    return strategy.processUpload(data);
  }

  async processDelete(
    configSource: ConfigSource,
    data: DeleteProviderData,
  ): Promise<DeleteResult> {
    const strategy = this.getStrategy(configSource);
    return strategy.processDelete(data);
  }

  validateProvider(
    provider: StorageProvider,
    fileCategory: FileCategory,
  ): boolean {
    const strategy = this.getStrategy(provider.configSource);
    return strategy.validateProvider(provider, fileCategory);
  }
}
