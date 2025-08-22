import { UploadResult } from "./upload-result";

export interface UploadProvider<TConfig = Record<string, any>> {
  upload(options: {
    providerId: string,
    providerConfig: TConfig; // Configuración tipada específica por provider
    filePath: string;
    originalName: string;
    uploadId: string;
  }): Promise<UploadResult>;
}
