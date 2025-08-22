import appConfig from './app.config';
import dbConfig from './db.config';
import doodstreamConfig from './doodstream.config';
import encryptionConfig from './encryption.config';
import jwtConfig from './jwt.config';

export type Env = 'development' | 'testing' | 'staging' | 'production';

export default [
  appConfig,
  encryptionConfig,
  dbConfig,
  jwtConfig,
  doodstreamConfig,
];
