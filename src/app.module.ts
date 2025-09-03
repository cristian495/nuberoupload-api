import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RealTimeModule } from './modules/real-time/real-time.module';
import { DoodstreamModule } from './modules/doodstream/doodstream.module';
import config, { Env } from './config';
import * as Joi from 'joi';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesModule } from './modules/files/files.module';
import { StorageProvidersModule } from './modules/storage-providers/storage-providers.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { ProviderTemplatesModule } from './modules/provider-templates/provider-templates.module';
import { AuthModule } from './modules/auth/auth.module';
import { DBConfig } from './config/db.config';
import { StorjModule } from './modules/storj/storj.module';

const currentENV = process.env.NODE_ENV as Env;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: config,
      envFilePath: [`.env.${currentENV}`, '.env'],
      validationSchema: Joi.object({
        // solo valida lo que está en el .env y en el comando de ejecución
        JWT_SECRET: Joi.string().required(),
        NODE_ENV: Joi.string()
          .valid('development', 'testing', 'staging', 'production')
          .required(),
        DOODSTREAM_API_KEY: Joi.string().required(),
        MONGO_URI: Joi.string().required(),
        ENCRYPTION_KEY: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().required(),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<DBConfig>('db')?.mongoURI,
      }),
    }),
    UsersModule,
    ConfigModule,
    UploadsModule,
    RealTimeModule,
    DoodstreamModule,
    FilesModule,
    StorageProvidersModule,
    EncryptionModule,
    ProviderTemplatesModule,
    AuthModule,
    StorjModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
