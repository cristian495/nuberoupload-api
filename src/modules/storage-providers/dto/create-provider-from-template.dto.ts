import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
} from 'class-validator';

export class CreateProviderFromTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;
}