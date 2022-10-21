import { Constructor } from '@loopback/context';
import { ClassDecoratorFactory } from '@loopback/metadata';
import { IModule } from '../types/module.interface.js';

export const MODULE_META_KEY = 'hisorange:module';

export type ModuleResolver = { resolve: () => Constructor<IModule> };
export type ModuleConcrete = Constructor<IModule> | ModuleResolver;

export type IModuleMeta = {
  /**
   * Injectable services
   */
  providers?: Constructor<unknown>[];

  /**
   * Modules used in the module as a dependency,
   * this enforces the rule that the module cannot start until the dependency is ready.
   */
  dependsOn?: ModuleConcrete[];

  /**
   *
   */
  imports?: ModuleConcrete[];
};

export function Module(meta?: IModuleMeta) {
  return ClassDecoratorFactory.createDecorator<IModuleMeta>(
    MODULE_META_KEY,
    meta ?? {},
    {
      decoratorName: '@Module',
    },
  );
}
