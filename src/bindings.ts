import { BindingKey } from '@loopback/context';
import { type IKernel } from './types/kernel.interface.js';
import { type ILogger } from './types/logger.interface.js';

export const KernelBinding = {
  kernel: BindingKey.create<IKernel>('kernel'),
  logger: BindingKey.create<ILogger>('logger'),
};
