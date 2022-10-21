import pino from 'pino';
import { ILogger } from '../types/logger.interface.js';

export const createLogger = (): ILogger => {
  const instance = 'app';

  // Turn logging back when it's useful to debug test sequnces.
  const enabled = process.env.NODE_ENV !== 'test';

  const formatters: pino.LoggerOptions['formatters'] = {
    level(label: string) {
      return { level: label };
    },
    bindings(bindings) {
      return { instance };
    },
  };

  return pino({
    level: process.env.NODE_ENV === 'production' ? 'debug' : 'debug',
    enabled,
    formatters,
    nestedKey: 'payload',
    messageKey: 'message',
  });
};
