import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export class AddressDto {
  @ApiProperty() city: string;
  @ApiProperty() country: string;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    enum: UserRole,
    default: UserRole.USER,
    example: 'John Doe',
    description: 'Nombre del usuario',
    required: true,
    // type: String,
  })
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    example: 'johndoe@gmail.com',
    description: 'Email del usuario',
    required: false,
    type: String,
  })
  email: string;

  @ApiProperty({ type: () => AddressDto })
  @IsOptional()
  address: AddressDto;
}
