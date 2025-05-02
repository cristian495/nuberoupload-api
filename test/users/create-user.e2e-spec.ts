import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../../src/app.module';
import * as request from 'supertest';

describe('UsersController (e2e)', () => {
  let app: INestApplication;

  const endpoint = '/users/create-user';
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();

    // Activamos validación global
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  it('✅ debe crear un usuario correctamente', async () => {
    const payload = {
      name: 'Cristian',
      email: 'test@example.com',
      address: 'mz c lote 1',
    };

    const res = await request(app.getHttpServer())
      .post(endpoint)
      .send(payload)
      .expect(201);

    expect(res.body.user).toMatchObject({
      name: payload.name,
      email: payload.email,
      address: payload.address,
    });
    expect(res.body.user).toHaveProperty('id');
  });

  it('❌ debe fallar si falta el email', async () => {
    const payload = {
      name: 'Cristian',
      address: 'mz c lote 1',
    };

    const res = await request(app.getHttpServer())
      .post(endpoint)
      .send(payload)
      .expect(400);

      console.log(res.body);
  });
});
