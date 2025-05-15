import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RealTimeModule } from './modules/real-time/real-time.module';
import { DoodstreamModule } from './modules/doodstream/doodstream.module';
import config from './config';
import * as Joi from 'joi';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      validationSchema: Joi.object({
        // solo valida lo que está en el .env y comando de ejecución
        JWT_SECRET: Joi.string().required(),
        NODE_ENV: Joi.string()
          .valid('development', 'testing', 'staging', 'production')
          .required(),
        DOODSTREAM_API_KEY: Joi.string().required(),
        MONGO_URI: Joi.string().required(),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),
    UsersModule,
    ConfigModule,
    UploadsModule,
    RealTimeModule,
    DoodstreamModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
