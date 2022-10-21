import { Context, inject } from '@loopback/context';
import { IKernel } from '../types/kernel.interface.js';
import { ILogger } from '../types/logger.interface.js';

export function Logger(
  scope?: string,
): (
  target: Object,
  member: string,
  methodDescriptorOrParameterIndex?: number | TypedPropertyDescriptor<unknown>,
) => void {
  return inject(
    'Kernel',
    {
      decorator: '@Logger',
    },
    async (ctx: Context, injection): Promise<ILogger> =>
      (await ctx.get<IKernel>('Kernel')).logger.child({
        service: scope ?? (injection.target as Function).name,
      }),
  );
}
