import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateProviderForRuntimeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  templateId: string;
}
