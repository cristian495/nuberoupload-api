// upload-media.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class UploadMediaDto {
  @IsString()
  @IsNotEmpty()
  folderName: string;

  @IsString()
  @IsNotEmpty()
  uploadId: string;
}
