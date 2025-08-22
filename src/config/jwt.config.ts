import { registerAs } from '@nestjs/config';
import { Env } from '.';

export type JWTConfig = {
  secret: string;
};

export default registerAs('jwt', () => {
  const env = process.env.NODE_ENV as Env;

  return {
    secret: process.env.JWT_SECRET,
  };
});
