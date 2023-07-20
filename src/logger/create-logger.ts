import { pino } from 'pino';
import { ILogger } from '../types/logger.interface';

export const createLogger = (): ILogger => {
  return pino({
    name: 'kernel',
    level: process.env.LOG_LEVEL || 'debug',
  });
};
