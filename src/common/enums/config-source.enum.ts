export enum ConfigSource {
  DATABASE = 'database', // Almacenamiento tradicional en BD con encriptación
  RUNTIME = 'runtime', // Credenciales enviadas en cada request (no se almacenan)
}
