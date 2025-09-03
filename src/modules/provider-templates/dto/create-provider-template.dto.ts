import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsIn,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ALL_SUPPORTED_EXTENSIONS } from '../../../common/constants/file-extensions';

export class CredentialFieldDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsIn(['text', 'password', 'select', 'textarea'])
  type: 'text' | 'password' | 'select' | 'textarea';

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsBoolean()
  required: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  options?: { value: string; label: string }[];
}

export class CreateProviderTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsArray()
  @IsString({ each: true })
  @IsIn(ALL_SUPPORTED_EXTENSIONS, {
    each: true,
    message:
      'Extension must be one of the supported extensions: ' +
      ALL_SUPPORTED_EXTENSIONS.join(', '),
  })
  supportedExtensions: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CredentialFieldDto)
  fields: CredentialFieldDto[];
}
