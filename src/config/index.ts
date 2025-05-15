import * as Joi from 'joi';
import { Logger } from '@nestjs/common';
import app from './app/app.config';
import { appSchema } from './app/app.schema';
import { Env } from './env.type';
const logger = new Logger('Config');

export default () => {
  const env = process.env.NODE_ENV as Env;

  const config = {
    app: app(env),
  };

  const validationSchema = Joi.object({
    ...appSchema.describe().keys,
  });

  const { error, value: validatedConfig } = validationSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    logger.error('Config validation error:', error.details);
    throw new Error(`Config validation error: ${error.message}`);
  }

  logger.log(`Environment ${env}`);
  logger.log(`Puerto ${validatedConfig.app.port}`);
  logger.log(`Nombre ${validatedConfig.app.name}`);
  logger.log(`BD ${process.env.MONGO_URI}`);
  logger.log(`Frontend ${validatedConfig.app.frontendUrl}`);
  logger.log(`Allowed Origins ${validatedConfig.app.allowedOrigins}`);

  return config;
};
