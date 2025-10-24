import { IsObject, IsNotEmpty } from 'class-validator';

export class TestConnectionWithRuntimeDto {
  @IsObject()
  @IsNotEmpty()
  credentials: Record<string, any>;
}
