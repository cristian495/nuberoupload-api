import { allow } from 'joi';

export default (env) => {
  const config = {
    development: () => {
      return {
        port: 8000,
        name: 'Nuberoupload',
        frontendUrl: 'http://localhost:3001',
        allowedOrigins: ['http://localhost:3001', 'http://localhost:3000'],
      };
    },
    testing: () => {
      return { port: null, name: 'Nuberoupload' };
    },
    staging: () => {
      return { port: 3002, name: 'Nuberoupload' };
    },
    production: () => {
      return { port: 3003, name: 'Nuberoupload' };
    },
  };
  return config[env]();
};
