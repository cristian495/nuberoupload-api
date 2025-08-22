import {
  Body,
  Controller,
  Get,
  Post,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { StorageProvidersService } from './storage-providers.service';
import { CreateStorageProviderDto } from './dto/create-storage-provider.dto';
import { CreateProviderFromTemplateDto } from './dto/create-provider-from-template.dto';

@Controller('storage-providers')
export class StorageProvidersController {
  userId: string;
  constructor(private storageProvService: StorageProvidersService) {
    this.userId = 'exampleId';
  }

  // @Post('/')
  // async createStorageProvider(@Body() body: CreateStorageProviderDto) {
  //   const created = await this.storageProvService.addStorageProvider(
  //     body,
  //     this.userId,
  //   );

  //   return created;
  // }

  @Get('/')
  async getStorageProviders() {
    const result = await this.storageProvService.getStorageProviders(
      this.userId,
    );

    return result;
  }

  @Post('/from-template')
  async createProviderFromTemplate(
    @Body() body: CreateProviderFromTemplateDto,
  ) {
    // throw new BadRequestException(`Required field`);
    const created = await this.storageProvService.createProviderFromTemplate(
      body,
      this.userId,
    );

    return created;
  }
}
