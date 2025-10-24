import { Transform, Type, plainToInstance } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { RuntimeProviderCredentials } from './upload-file.with-runtime-credential';

export class DeleteFileRuntimeDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RuntimeProviderCredentials)
  @Transform(({ value }) => {
    // Si viene como string JSON, parsear y transformar a instancias
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        // Convertir cada objeto plano a instancia de RuntimeProviderCredentials
        const instances = plainToInstance(RuntimeProviderCredentials, parsed);
        return instances;
      } catch (error) {
        return value;
      }
    }

    // Si ya es un array (notación de índices en form-data)
    return value;
  })
  providerCredentials: RuntimeProviderCredentials[];
}
