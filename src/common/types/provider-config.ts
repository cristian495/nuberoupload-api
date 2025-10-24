import { DoodstreamConfig } from 'src/config/doodstream.config';
import { StorjConfig } from 'src/modules/storj/types/storj-config.interface';

export type ProviderConfig =
  | DoodstreamConfig
  | StorjConfig
  | Record<string, any>;
