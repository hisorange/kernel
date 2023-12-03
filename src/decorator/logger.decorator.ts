import { Context, inject } from '@loopback/context';
import { KernelBinding } from '../bindings.js';
import { type ILogger } from '../types/logger.interface.js';

export function Logger(
  scope?: string,
): (
  target: Object,
  member: string,
  methodDescriptorOrParameterIndex?: number | TypedPropertyDescriptor<unknown>,
) => void {
  return inject(
    KernelBinding.logger,
    {
      decorator: '@Logger',
    },
    async (ctx: Context, injection): Promise<ILogger> =>
      (await ctx.get(KernelBinding.logger)).child({
        scope: scope ?? (injection.target as Function).name,
      }),
  );
}
