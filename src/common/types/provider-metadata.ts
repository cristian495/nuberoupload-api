export interface StorjMetadata {
  bucket: string;
  key: string;
  size: number;
  etag?: string;
  location?: string;
  thumbnail: string;
}

export interface DoodstreamMetadata {
  filecode: string;
  thumbnail: string;
  size: number;
  title?: string;
  splash_img?: string;
}

export interface S3Metadata {
  bucket: string;
  key: string;
  size: number;
  etag?: string;
  versionId?: string;
  thumbnail: string;
}

// Para providers futuros o genéricos
export interface GenericMetadata extends Record<string, any> {
  thumbnail?: string;
  size?: number;
}