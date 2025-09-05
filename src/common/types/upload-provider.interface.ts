import { UploadResult } from "./upload-result";

export interface ConnectionTestResult {
  isHealthy: boolean;
  error?: string;
}

export interface UploadProvider<TConfig = Record<string, any>> {
  upload(options: {
    providerId: string,
    providerConfig: TConfig; // Configuración tipada específica por provider
    filePath: string;
    originalName: string;
    fileId: string;
    folderName: string;
  }): Promise<UploadResult>;

  delete(options: {
    providerId: string;
    providerConfig: TConfig;
    metadata: Record<string, any>; // Metadata del archivo para identificarlo
  }): Promise<{ success: boolean; error?: string }>;

  testConnection(config: TConfig): Promise<ConnectionTestResult>;
}
