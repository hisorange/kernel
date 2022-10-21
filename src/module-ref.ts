import { Constructor } from '@loopback/context';
import { ModuleResolver } from './decorator/module.decorator.js';
import { IModule } from './types/module.interface.js';

export const moduleRef = (
  resolve: () => Constructor<IModule>,
): ModuleResolver => ({
  resolve,
});
