import { registerAs } from '@nestjs/config';
import { Env } from '.';

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

export default registerAs('googleOAuth', () => {
  const env = process.env.NODE_ENV as Env;

  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  };
});