import type { Logger } from 'pino';

// This interface is here to avoid import collision with the @Logger decorator.
export type ILogger = Logger;
