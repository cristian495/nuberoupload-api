import * as Joi from 'joi';

export const appSchema = Joi.object({
  port: Joi.number().required(),
  name: Joi.string().required(),
  frontendUrl: Joi.string().required(),
  allowedOrigins: Joi.array().items(Joi.string()).required(),
});
