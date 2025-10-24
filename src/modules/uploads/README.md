# Uploads Module (File Operations)

## Responsabilidad Principal

Orquestar el **proceso completo de subida de archivos** desde el cliente hasta múltiples storage providers externos.

## Lo que SÍ hace

- ✅ Recibir archivos del cliente (via Multer)
- ✅ Guardar archivos temporalmente en disco local (`temp/uploads/`)
- ✅ Coordinar uploads a múltiples providers en paralelo
- ✅ Soportar dos modos de credenciales:
  - **DATABASE**: Credenciales almacenadas y encriptadas
  - **RUNTIME**: Credenciales enviadas por request
- ✅ Emitir eventos de progreso vía WebSocket
- ✅ Orquestar eliminación de archivos de múltiples providers
- ✅ Validar que providers soporten el tipo de archivo

## Lo que NO hace

- ❌ NO gestiona credenciales de providers (ver `storage-providers`)
- ❌ NO almacena metadata permanente de archivos (ver `files`)
- ❌ NO implementa APIs de providers (ver `provider-registry`)
- ❌ NO encripta/desencripta credenciales (ver `encryption`)

## Arquitectura

### Patrón Strategy

El módulo usa el **Strategy Pattern** para manejar diferentes fuentes de configuración:

```
UploadsService
    ↓
UploadFactory (selecciona strategy según configSource)
    ↓
┌─────────────────────┬─────────────────────┐
│ DatabaseUploadStrategy │ RuntimeUploadStrategy │
│ - Usa provider.config  │ - Usa request credentials │
└─────────────────────┴─────────────────────┘
```

### Flujo de Upload

```
1. Cliente → POST /uploads/file/[database|runtime]
   ↓
2. UploadsController
   - Valida archivo con Multer
   - Autentica usuario (JWT)
   - Valida providers pertenecen al usuario
   ↓
3. UploadsService
   a) Guardar temporalmente (síncrono)
   b) Crear registro en DB (síncrono)
   c) Responder al cliente con fileId
   ↓
4. Proceso Asíncrono (2s delay)
   - Para cada provider:
     → Validar soporte de tipo de archivo
     → Delegar a UploadFactory
     → Strategy resuelve credenciales
     → Ejecuta upload a provider externo
     → Guarda resultado en DB
     → Emite progreso vía WebSocket
```

## Dependencias

### Módulos Externos
- `FilesModule` - Crear/actualizar metadata de archivos
- `StorageProvidersModule` - Obtener configuración de providers
- `ProviderRegistryModule` - Servicios de providers (Doodstream, Storj)
- `EncryptionModule` - Desencriptar credenciales DATABASE
- `ProviderConfigModule` - Resolver configuración según configSource
- `RealTimeModule` - WebSocket para notificaciones de progreso

## Endpoints

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/uploads/file/database` | POST | JWT | Upload con providers DATABASE |
| `/uploads/file/runtime` | POST | JWT | Upload con providers RUNTIME (credentials en request) |
| `/uploads/:fileId` | DELETE | JWT | Eliminar archivo de todos los providers |

## DTOs

### UploadFileWithDatabaseCredentialsDto
```typescript
{
  folderName: string;        // Carpeta destino
  providerIds: string[];     // IDs de providers (deben ser DATABASE)
}
```

### UploadFileWithRuntimeCredentialsDto
```typescript
{
  folderName: string;
  providerCredentials: [
    {
      providerId: string;
      credentials: Record<string, any>  // Credenciales específicas del provider
    }
  ]
}
```

## Strategies

### DatabaseUploadStrategy
- **Usa:** Credenciales almacenadas en `provider.config` (encriptadas)
- **Flujo:** Fetch provider → Decrypt config → Upload
- **Ventajas:** No requiere credentials en cada request
- **Limitaciones:** Requiere configuración previa en DB

### RuntimeUploadStrategy
- **Usa:** Credenciales enviadas en el request
- **Flujo:** Validate credentials → Upload
- **Ventajas:** No almacena credenciales sensibles
- **Limitaciones:** Cliente debe enviar credentials cada vez

## Eventos WebSocket

### upload-progress
```typescript
{
  fileId: string;
  providerId?: string;
  status: 'starting' | 'completed' | 'error';
  url?: string;
  error?: string;
}
```

### delete-progress
```typescript
{
  fileId: string;
  provider: string;
  providerId?: string;
  status: 'starting' | 'completed' | 'error';
  error?: string;
}
```

## Almacenamiento Temporal

Los archivos se guardan temporalmente en:
```
temp/uploads/{fileId}/{originalFilename}
```

**Importante:** El módulo NO gestiona limpieza de archivos temporales. Esto debe implementarse por separado.

## Configuración

### Multer
- Destino temporal: `./multer-uploads`
- Tamaño máximo: `500MB` por archivo
- Storage: `diskStorage`

## Testing

```bash
# Unit tests
pnpm test uploads.service

# Integration tests
pnpm test:e2e uploads
```

## Escalabilidad Futura

### Features Planeadas
- [ ] Batch uploads (múltiples archivos en un request)
- [ ] Resumable uploads (upload grande con pause/resume)
- [ ] Scheduled uploads (diferir upload para off-peak hours)
- [ ] Upload con transformación (resize imágenes, transcode video)

### Limitaciones Actuales
- Solo soporta 1 archivo por request
- No hay validación de quota/límites por usuario
- No hay retry logic si upload falla
- Archivos temporales no se limpian automáticamente
