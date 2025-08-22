import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsObject,
  IsNotEmpty,
} from 'class-validator';

export class CreateStorageProviderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;
}
