import { registerAs } from '@nestjs/config';
import { Env } from '.';

export type DBConfig = {
  mongoURI: string;
};

export default registerAs('db', (): DBConfig => {
  const env = process.env.NODE_ENV;

  return {
    mongoURI: process.env.MONGO_URI!, // 🔥 Ahora se evalúa después de que .env ha sido cargado
    ...(env === 'development' ? {} : {}),
  };
});
