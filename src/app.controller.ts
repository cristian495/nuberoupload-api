import { Controller, Get, HttpStatus, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): Object {


    // return this.appService.getHello();
    return {
      port: this.configService.get('app.port'),
      jwtsecret: this.configService.get('JWT_SECRET'),
    }
  }
}
