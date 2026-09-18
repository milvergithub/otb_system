import { registerAs } from '@nestjs/config';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export interface LoggerConfig {
  level: string;
  transports: winston.transport[];
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const logDir = join(process.cwd(), 'logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

export default registerAs('logger', (): LoggerConfig => ({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console({ format: jsonFormat }),
    new DailyRotateFile({
      filename: join(logDir, 'backend-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: jsonFormat,
    }),
  ],
}));
