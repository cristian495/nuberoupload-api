import { registerAs } from '@nestjs/config';
import { Env } from '.';

export type AppConfig = {
  name: string;
  port: number;
  frontendUrl: string;
  allowedOrigins: string[];
};

export default registerAs('app', () => {
  const env = process.env.NODE_ENV as Env;
  return {
    name: 'Nuberoupload',
    ...(env === 'development' && {
      port: 8000,
      frontendUrl: 'http://localhost:3001',
      allowedOrigins: ['http://localhost:3001', 'http://localhost:3000'],
    }),
    ...(env === 'testing' && {
      port: 9000,
    }),
    ...(env === 'staging' && {
      port: 3002,
    }),
    ...(env === 'production' && {
      port: 3003,
    }),
  };
});
