import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfig } from './config/app.config';
import { JWTConfig } from './config/jwt.config';
import { ConfigService } from '@nestjs/config';
import { Env } from './config';
import { DBConfig } from './config/db.config';

@Injectable()
export class AppService implements OnModuleInit {
  getHello(): string {
    return 'Hello World!';
  }

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const logger = new Logger('Config');
    const app = this.configService.getOrThrow<AppConfig>('app');
    const db = this.configService.getOrThrow<DBConfig>('db');

    logger.log(`App Name: ${app.name}`);
    logger.log(`Running on Port: ${app.port}`);
    logger.log(`Frontend URL: ${app.frontendUrl}`);
    logger.log(`Mongo URI: ${db.mongoURI}`);
    logger.log('🚀 Application initialized successfully');
  }
}
