import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import {
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserSwagger } from './../docs/decorators/users/create-user-swagger.decorator';
import { UsersService } from './users.service';

@ApiTags('Modulo de Usuarios')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('create-user')
  @CreateUserSwagger()
  @HttpCode(201)
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return {
      message: 'Usuario creado correctamente',
      user,
    };
  }
}
