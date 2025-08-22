import { Injectable } from '@nestjs/common';
import { StorageProvidersCodes } from '../../common/types/storage-providers-codes';
import { DoodstreamService } from '../doodstream/doodstream.service';
import { UploadProvider } from '../../common/types/upload-provider.interface';

/**
 * Servicio centralizado para el registro de providers de almacenamiento
 * Evita dependencias circulares y proporciona single source of truth
 */
@Injectable()
export class ProviderRegistryService {
  private readonly availableProviders: Record<string, UploadProvider>;

  constructor(
    private doodstreamService: DoodstreamService,
    // Agregar nuevos servicios aquí cuando se implementen
    // private megaNzService: MegaNzService,
  ) {
    // Registry centralizado - solo providers con servicio implementado
    this.availableProviders = {
      [StorageProvidersCodes.DOODSTREAM]: this.doodstreamService,
      // [StorageProvidersCodes.MEGA_NZ]: this.megaNzService,
    };
  }

  /**
   * Obtiene los códigos de providers que tienen servicio implementado
   */
  getAvailableProviderCodes(): string[] {
    return Object.keys(this.availableProviders);
  }

  /**
   * Verifica si un código de provider está disponible
   */
  isProviderAvailable(code: string): boolean {
    return code in this.availableProviders;
  }

  /**
   * Obtiene el servicio de un provider específico
   */
  getProviderService(code: string): UploadProvider {
    const provider = this.availableProviders[code];
    if (!provider) {
      throw new Error(`Provider service not implemented: ${code}`);
    }
    return provider;
  }

  /**
   * Obtiene todos los providers disponibles
   */
  getAvailableProviders(): Record<string, UploadProvider> {
    return { ...this.availableProviders };
  }
}