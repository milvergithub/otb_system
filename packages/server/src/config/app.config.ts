import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  bodyLimit: string;
}

export default registerAs('app', (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  bodyLimit: process.env.BODY_LIMIT || '10mb',
}));
