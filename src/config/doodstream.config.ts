import { registerAs } from '@nestjs/config';
import { Env } from '.';

export type DoodstreamConfig = {
  apiKey: string;
};

export default registerAs('doodstream', () => {
  const env = process.env.NODE_ENV as Env;

  return {
    encryptionKey: process.env.DOODSTREAM_API_KEY,
    ...(env === 'development' && {}),
  };
});
