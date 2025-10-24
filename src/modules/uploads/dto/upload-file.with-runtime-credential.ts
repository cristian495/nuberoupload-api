// upload-file.dto.ts
import { Transform, Type, plainToInstance } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';

export class RuntimeProviderCredentials {
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @IsObject()
  @IsNotEmpty()
  credentials: Record<string, any>;
}

export class UploadFileWithRuntimeCredentialsDto {
  @IsString()
  @IsNotEmpty()
  folderName: string;

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
    // @Type() se encargará de la transformación
    return value;
  })
  providerCredentials: RuntimeProviderCredentials[];
}
