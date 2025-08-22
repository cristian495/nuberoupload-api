import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import ProgressStream from 'progress-stream';
import { WsEmitterService } from '../real-time/ws-emitter.service';
import { StorageProvidersCodes } from 'src/common/types/storage-providers-codes';
import got from 'got';

import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { uploadWithProgress } from 'src/common/helpers/upload-with-progress.util';
import { DoodstreamConfig as DoodstreamConfigType } from './types/doodstream-config.interface';
import { UploadResult } from 'src/common/types/upload-result';
import { UploadProvider } from 'src/common/types/upload-provider.interface';

export interface DoodstreamUploadResponse {
  status: number;
  msg: string;
  server_time: string;

  result: {
    download_url: string;
    single_img: string;
    status: number;
    filecode: string;
    splash_img: string;
    canplay: string;
    size: string;
    length: string;
    uploaded: string;
    protected_embed: string;
    protected_dl: string;
    title: string;
  }[];
}
export interface DoodstreamGetUploadUrlResponse {
  msg: string;
  server_time: string;
  status: number;
  result: string;
}

@Injectable()
export class DoodstreamService implements UploadProvider<DoodstreamConfigType> {
  constructor(
    private wsEmitter: WsEmitterService,
  ) {}

  async upload({
    providerId,
    providerConfig,
    filePath,
    originalName,
    uploadId,
  }: {
    providerId: string;
    providerConfig: DoodstreamConfigType;
    filePath: string;
    originalName: string;
    uploadId: string;
  }): Promise<UploadResult> {
    const apiKey = providerConfig.apiKey; // ✅ Type-safe access

    const serverRes = await got
      .get(`https://doodapi.co/api/upload/server?key=${apiKey}`)
      .json<DoodstreamGetUploadUrlResponse>();
    const uploadUrl = serverRes.result;

    console.log('uploadWithProgress', {
      url: uploadUrl,
      filePath,
      originalName,
      fields: { api_key: apiKey },
      uploadId,
      io: this.wsEmitter,
      provider: StorageProvidersCodes.DOODSTREAM,
    });
    const res = await uploadWithProgress({
      url: uploadUrl,
      filePath,
      originalName,
      fields: { api_key: apiKey },
      uploadId,
      providerId,
      io: this.wsEmitter,
      provider: StorageProvidersCodes.DOODSTREAM,
    });

    const result = res.raw?.result?.[0];
    if (!result || !result.filecode) {
      throw new Error('No se recibió filecode válido de Doodstream');
    }

    return {
      provider: StorageProvidersCodes.DOODSTREAM,
      url: `https://dood.to/e/${result.filecode}`,
      metadata: {
        filecode: result.filecode,
        thumbnail: result.splash_img,
        size: Number(result.size),
        title: result.title,
      },
    };
  }
}
