import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpException,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { StorageProvidersService } from './storage-providers.service';
import { CreateStorageProviderDto } from './dto/create-storage-provider.dto';
import { CreateProviderFromTemplateDto } from './dto/create-provider-from-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';

@Controller('storage-providers')
@UseGuards(JwtAuthGuard)
export class StorageProvidersController {
  constructor(private storageProvService: StorageProvidersService) {}

  // @Post('/')
  // async createStorageProvider(@Body() body: CreateStorageProviderDto) {
  //   const created = await this.storageProvService.addStorageProvider(
  //     body,
  //     this.userId,
  //   );

  //   return created;
  // }

  @Get('/')
  async getStorageProviders(@GetUser() user: AuthenticatedUser) {
    const result = await this.storageProvService.getStorageProviders(
      user._id.toString(),
    );

    return result;
  }

  @Post('/from-template')
  async createProviderFromTemplate(
    @Body() body: CreateProviderFromTemplateDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const created = await this.storageProvService.createProviderFromTemplate(
      body,
      user._id.toString(),
    );

    return created;
  }

  @Post(':id/test-connection')
  async testProviderConnection(
    @Param('id') providerId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.storageProvService.testProviderConnection(
      providerId,
      user._id.toString(),
    );
  }

  @Delete(':id')
  async deleteProvider(
    @Param('id') providerId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.storageProvService.deleteProvider(
      providerId,
      user._id.toString(),
    );
  }
}
