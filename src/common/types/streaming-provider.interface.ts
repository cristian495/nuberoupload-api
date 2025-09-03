import { Readable } from 'stream';

export interface StreamingOptions {
  range?: string;
  userId?: string;
}

export interface StreamingResult {
  stream: Readable;
  contentType: string;
  contentLength?: number;
  acceptRanges?: boolean;
  contentRange?: string;
  statusCode: number; // 200 or 206 for partial content
}

export interface StreamingProvider {
  canStream(providerCode: string): boolean;
  
  getStream(options: {
    providerConfig: Record<string, any>;
    metadata: Record<string, any>;
    streamingOptions?: StreamingOptions;
  }): Promise<StreamingResult>;
}