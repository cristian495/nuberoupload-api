import {
  StorjMetadata,
  DoodstreamMetadata,
  GenericMetadata,
} from './provider-metadata';
import { StorageProvidersCodes } from './storage-providers-codes';

export interface BaseUploadResult<TMetadata = GenericMetadata> {
  providerCode: string;
  providerId: string;
  url: string;
  thumbnail: string;
  metadata: TMetadata;
}

// Union type discriminado usando valores del enum
export type UploadResult =
  | (BaseUploadResult<StorjMetadata> & {
      providerCode: typeof StorageProvidersCodes.STORJ;
    })
  | (BaseUploadResult<DoodstreamMetadata> & {
      providerCode: typeof StorageProvidersCodes.DOODSTREAM;
    })
  | BaseUploadResult<GenericMetadata>; // Para providers futuros

// Type helpers para cada provider específico
export type StorjUploadResult = BaseUploadResult<StorjMetadata> & {
  providerCode: typeof StorageProvidersCodes.STORJ;
};
export type DoodstreamUploadResult = BaseUploadResult<DoodstreamMetadata> & {
  providerCode: typeof StorageProvidersCodes.DOODSTREAM;
};
