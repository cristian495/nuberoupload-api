# Storage Providers Module (Provider Management)

## Responsabilidad Principal

Gestionar el **ciclo de vida completo de storage providers** configurados por los usuarios.

## Lo que SÍ hace

- ✅ CRUD de storage providers para cada usuario
- ✅ Encriptar y almacenar credenciales de providers (modo DATABASE)
- ✅ Registrar providers sin almacenar credenciales (modo RUNTIME)
- ✅ Validar configuraciones contra templates
- ✅ Testear conectividad con providers
- ✅ Gestionar estado de salud de conexiones
- ✅ Mostrar credenciales enmascaradas (últimos 10% de caracteres)

## Lo que NO hace

- ❌ NO sube archivos (ver `uploads`)
- ❌ NO implementa APIs de providers (ver `provider-registry`)
- ❌ NO gestiona metadata de archivos (ver `files`)
- ❌ NO maneja streaming de archivos (ver `files` + `streaming`)

## Arquitectura

### Patrón Strategy + Factory

```
StorageProvidersService
    ↓
StorageProviderFactory (selecciona strategy según configSource)
    ↓
┌──────────────────────────┬────────────────────────────┐
│ DatabaseConfigStrategy    │ RuntimeConfigStrategy      │
│ - Encripta y guarda config│ - Solo guarda metadata     │
│ - Test con config stored  │ - Test requiere credentials│
└──────────────────────────┴────────────────────────────┘
```

### ConfigSource Modes

El módulo soporta dos modos de almacenamiento de credenciales:

#### DATABASE Mode
- **Config almacenado:** Sí (encriptado con AES-256)
- **Uso:** Providers de uso frecuente
- **Seguridad:** Credenciales en reposo protegidas
- **Operaciones:** Todas soportadas (upload, delete, stream, test)

#### RUNTIME Mode
- **Config almacenado:** No (solo metadata del provider)
- **Uso:** Providers temporales, one-time uploads, guest access
- **Seguridad:** Credenciales nunca persisten
- **Operaciones:** Limitadas (upload y delete requieren credentials en request)

## Modelo de Datos

### StorageProvider Schema

```typescript
{
  userId: string;                    // Owner del provider
  name: string;                       // Nombre display (e.g., "Mi Doodstream")
  code: string;                       // Código del provider (e.g., "doodstream")
  templateId: string;                 // Referencia al template usado
  description?: string;               // Descripción opcional

  configSource: ConfigSource;         // 'database' | 'runtime'
  config?: Record<string, any>;       // Credenciales encriptadas (DATABASE only)
  configLastChars: Record<string, any>; // Últimos caracteres para UI

  supportedExtensions: string[];      // [".mp4", ".jpg", etc]
  isActive: boolean;                  // Provider habilitado/deshabilitado

  lastConnectionCheck?: Date;         // Último test de conexión
  isConnectionHealthy?: boolean;      // Estado de salud
  connectionError?: string;           // Error del último test
}
```

## Endpoints

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/storage-providers` | GET | JWT | Listar providers del usuario |
| `/storage-providers/from-template` | POST | JWT | Crear provider desde template (DATABASE) |
| `/storage-providers/:id/test-connection` | POST | JWT | Probar conexión (DATABASE) |
| `/storage-providers/:id/test-connection/runtime` | POST | JWT | Probar conexión con credentials (RUNTIME) |
| `/storage-providers/:id` | DELETE | JWT | Eliminar provider |

## DTOs

### CreateProviderFromTemplateDto (DATABASE)
```typescript
{
  templateId: string;          // Template a usar
  name: string;                 // Nombre del provider
  description?: string;         // Descripción opcional
  config: Record<string, any>;  // Credenciales (serán encriptadas)
}
```

### CreateProviderForRuntimeDto (RUNTIME)
```typescript
{
  templateId: string;
  name: string;
  description?: string;
  // NO incluye config - credentials por request
}
```

### TestConnectionWithRuntimeDto
```typescript
{
  credentials: Record<string, any>;  // Credentials temporales para test
}
```

## Strategies

### DatabaseConfigStrategy

**Creación:**
1. Valida template exists y está disponible
2. Valida config contra template.fields
3. Encripta cada valor de credencial
4. Crea versión enmascarada (90% oculto, 10% visible)
5. Guarda en MongoDB
6. Intenta test de conexión (async, non-blocking)

**Test Connection:**
1. Fetch provider de DB
2. Desencripta provider.config
3. Llama a providerService.testConnection()
4. Actualiza isConnectionHealthy en DB

**Eliminación:**
1. Elimina provider de storage_providers
2. Elimina referencias de FileItems

### RuntimeConfigStrategy

**Creación:**
1. Valida solo template (NO valida config)
2. Guarda metadata sin credenciales
3. configLastChars puede contener hints para UI
4. NO test de conexión (no hay credentials)

**Test Connection:**
1. Requiere credentials en request
2. Valida credentials contra template
3. Llama a providerService.testConnection()
4. NO actualiza DB (test temporal)

**Eliminación:**
1. Solo elimina metadata
2. Elimina referencias de FileItems

## Integración con Otros Módulos

### ProviderTemplates
- Define estructura de credenciales requeridas
- Campos de configuración (apiKey, apiSecret, host, etc)
- Extensiones soportadas por provider
- Usado para validación en creación

### ProviderRegistry
- Provee servicios concretos de providers (Doodstream, Storj)
- Valida que provider code existe y está disponible
- Usado para test de conexión y operaciones

### Encryption
- Encripta valores de config antes de guardar (DATABASE)
- Desencripta cuando se necesita usar (upload, delete, stream)
- AES-256 symmetric encryption

## Seguridad

### DATABASE Mode
- ✅ Credenciales encriptadas en MongoDB
- ✅ Clave de encriptación en variable de entorno
- ✅ Desencriptación solo en memoria durante operaciones
- ⚠️ Key management crítico (usar secrets manager)

### RUNTIME Mode
- ✅ No almacenamiento = no riesgo de breach de DB
- ⚠️ Credenciales en tránsito (HTTPS obligatorio)
- ⚠️ Credenciales en logs (sanitizar)
- ✅ Ideal para accesos temporales

### Isolation
- ✅ Providers aislados por userId
- ✅ Solo el owner puede ver/usar sus providers
- ✅ Validación de ownership en todos los endpoints

## Connection Health Monitoring

El módulo trackea salud de conexiones:

```typescript
{
  lastConnectionCheck: Date,      // Timestamp del último test
  isConnectionHealthy: boolean,   // true/false según último test
  connectionError: string         // Mensaje de error si falló
}
```

**Test Automático:**
- Se intenta al crear provider (DATABASE only)
- Background, non-blocking
- Resultado guardado en DB

**Test Manual:**
- Usuario puede triggear en cualquier momento
- Endpoint: `POST /:id/test-connection`

## Templates

Los templates definen estructura de providers:

```typescript
{
  name: "Doodstream",
  code: "doodstream",
  supportedExtensions: [".mp4", ".avi", ".mkv"],
  fields: [
    { key: "apiKey", label: "API Key", type: "password", required: true },
    { key: "apiSecret", label: "API Secret", type: "password", required: false }
  ]
}
```

## Masked Credentials Display

Para mostrar en UI sin exponer credentials completas:

```typescript
// Original
config: {
  apiKey: "abc123xyz789"  // Encriptado en DB
}

// Display
configLastChars: {
  apiKey: "...xyz789"     // Últimos 10% de caracteres
}
```

## Testing

```bash
# Unit tests
pnpm test storage-providers.service

# Integration tests
pnpm test:e2e storage-providers
```

## Escalabilidad Futura

### Features Planeadas
- [ ] Soporte para más ConfigSources (ENVIRONMENT, VAULT, SSO)
- [ ] Provider presets (configuraciones comunes pre-cargadas)
- [ ] Bulk operations (crear/eliminar múltiples providers)
- [ ] Provider sharing entre usuarios (team accounts)
- [ ] Automatic credential rotation
- [ ] Connection health alerting

### Limitaciones Actuales
- Solo soporta 2 ConfigSources (DATABASE, RUNTIME)
- No hay credential rotation automática
- No hay alertas si provider no healthy
- No hay rate limiting en test connection
- Config validation básica (solo required fields)
