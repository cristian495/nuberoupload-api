import { registerAs } from '@nestjs/config';
import { Env } from '.';

export type EncryptionConfig = {
  encryptionKey: string;
};

export default registerAs('encryption', () => {
  const env = process.env.NODE_ENV as Env;

  return {
    encryptionKey: process.env.ENCRYPTION_KEY,
    ...(env === 'development' && {}),
  };
});
