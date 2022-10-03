import { Constructor } from '@loopback/context';
import { ModuleResolver } from './decorator/module.decorator';
import { IModule } from './types/module.interface';

export const moduleRef = (
  resolve: () => Constructor<IModule>,
): ModuleResolver => ({
  resolve,
});
