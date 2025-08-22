export interface UploadResult {
  provider: string;
  url: string;
  metadata: {
    filecode?: string;
    thumbnail: string;
    size?: number;
    [key: string]: any;
  };
}
