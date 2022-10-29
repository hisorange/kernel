import chalk from 'chalk';
import winston, { createLogger as factory, format } from 'winston';
import { ILogger } from '../types/logger.interface';

const { combine, timestamp, printf, splat } = format;

export const createLogger = (): ILogger => {
  const levels = {
    debug: chalk.magenta('debug'),
    info: chalk.blue('info'),
    warn: chalk.yellow('warn'),
    error: chalk.red('error'),
    http: chalk.gray('http'),
    verbose: chalk.gray('verbose'),
  };
  const variable = chalk.yellow('$1');

  const loggedAt = timestamp({
    format: 'hh:mm:ss.SSS',
  });

  const logger = factory({
    handleExceptions: false,
    transports: [
      new winston.transports.Console({
        silent: false,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        stderrLevels: ['warn', 'error'],
        consoleWarnLevels: ['warn', 'error'],
        handleExceptions: false,
        format: combine(
          loggedAt,
          splat(),
          printf(({ timestamp, level, message, scope }) => {
            message = message
              ? message.replace(/\[([^\]]+)\]/g, '[' + variable + ']')
              : '';

            return `[${chalk.gray(timestamp)}][${levels[level]}][${chalk.green(
              scope ?? 'Kernel',
            )}] ${message} `;
          }),
        ),
      }),
    ],
    exitOnError: false,
  });

  return logger;
};
