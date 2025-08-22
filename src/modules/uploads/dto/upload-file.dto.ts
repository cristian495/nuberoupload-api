// upload-file.dto.ts
import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class UploadFileDto {
  @IsString()
  @IsNotEmpty()
  folderName: string;

  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  providerIds: string[];
}