import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService); // 🔐 accedemos a toda la config

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ❌ elimina propiedades no definidas en DTO
      forbidNonWhitelisted: true, // ❌ lanza error si hay propiedades desconocidas
      transform: true, // ✅ transforma tipos automáticamente
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Subidero API')
    .setDescription('Documentación de la API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(config.getOrThrow<number>('app.port')); // 🔐 accedemos a la config
}
bootstrap();
