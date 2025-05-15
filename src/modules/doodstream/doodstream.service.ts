import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';
import ProgressStream from 'progress-stream';
import { WsEmitterService } from '../real-time/ws-emitter.service';
import { StorageProviders } from 'src/common/types/storage-providers';
import got from 'got';

import { pipeline as streamPipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { uploadWithProgress } from 'src/common/helpers/upload-with-progress.util';

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

export interface UploadResult {
  provider: string;
  url: string;
  metadata?: {
    filecode?: string;
    thumbnail?: string;
    size?: number;
    [key: string]: any;
  };
}

@Injectable()
export class DoodstreamService {
  private readonly apiKey: string;
  constructor(
    private readonly configService: ConfigService,
    private wsEmitter: WsEmitterService,
  ) {
    this.apiKey = this.configService.get<string>('DOODSTREAM_API_KEY') || '';
  }

  async upload({
    filePath,
    originalName,
    uploadId,
  }: {
    filePath: string;
    originalName: string;
    uploadId: string;
    ƒ;
  }): Promise<UploadResult> {
    const serverRes = await got
      .get(`https://doodapi.co/api/upload/server?key=${this.apiKey}`)
      .json<DoodstreamGetUploadUrlResponse>();
    const uploadUrl = serverRes.result;

    const res = await uploadWithProgress({
      url: uploadUrl,
      filePath,
      originalName,
      fields: { api_key: this.apiKey },
      uploadId,
      io: this.wsEmitter,
      provider: StorageProviders.DOODSTREAM,
    });

    const result = res.raw?.result?.[0];
    if (!result || !result.filecode) {
      throw new Error('No se recibió filecode válido de Doodstream');
    }

    return {
      provider: StorageProviders.DOODSTREAM,
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
