import { Injectable } from '@nestjs/common';
import { ConfigSource } from 'src/common/enums/config-source.enum';
import { StorageProvider } from './schemas/storage-provider.schema';
import { ConnectionTestResult } from 'src/common/interfaces/config-resolver.interface';
import {
  StorageProviderStrategy,
  CreateStorageProviderData,
  DeleteStorageProviderResult,
  ValidationResult,
} from './strategies/storage-provider.strategy';
import { DatabaseConfigStrategy } from './strategies/database-config.strategy';
import { RuntimeConfigStrategy } from './strategies/runtime-config.strategy';

@Injectable()
export class StorageProviderFactory {
  private readonly strategies = new Map<
    ConfigSource,
    StorageProviderStrategy
  >();

  constructor(
    private databaseStrategy: DatabaseConfigStrategy,
    private runtimeStrategy: RuntimeConfigStrategy,
  ) {
    // Registrar estrategias
    this.strategies.set(ConfigSource.DATABASE, this.databaseStrategy);
    this.strategies.set(ConfigSource.RUNTIME, this.runtimeStrategy);
  }

  private getStrategy(configSource: ConfigSource): StorageProviderStrategy {
    const strategy = this.strategies.get(configSource);
    if (!strategy) {
      throw new Error(`Strategy not found for config source: ${configSource}`);
    }
    return strategy;
  }

  async createStorageProvider(
    data: CreateStorageProviderData,
    configSource: ConfigSource,
  ): Promise<StorageProvider> {
    const strategy = this.getStrategy(configSource);
    return strategy.createStorageProvider(data);
  }

  async deleteStorageProvider(
    provider: StorageProvider,
  ): Promise<DeleteStorageProviderResult> {
    const strategy = this.getStrategy(provider.configSource);
    return strategy.deleteStorageProvider(provider);
  }

  async testConnection(
    provider: StorageProvider,
    runtimeCredentials?: Record<string, any>,
  ): Promise<ConnectionTestResult> {
    const strategy = this.getStrategy(provider.configSource);
    return strategy.testConnection(provider, runtimeCredentials);
  }

  async validateStorageProvider(
    provider: StorageProvider,
  ): Promise<ValidationResult> {
    const strategy = this.getStrategy(provider.configSource);
    return strategy.validateStorageProvider(provider);
  }
}
