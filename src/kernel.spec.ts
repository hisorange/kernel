import { Context, Provider, ValueOrPromise } from '@loopback/context';
import { KERNEL_BINDING } from './bindings.js';
import { Inject } from './decorator/inject.decorator.js';
import { Logger } from './decorator/logger.decorator.js';
import { Module } from './decorator/module.decorator.js';
import { Service } from './decorator/service.decorator.js';
import { Kernel } from './kernel.js';
import { IKernel } from './types/kernel.interface.js';
import { ILogger } from './types/logger.interface.js';
import { IModule } from './types/module.interface.js';

describe('Kernel', () => {
  test('should initialize', () => {
    expect(() => new Kernel()).not.toThrow();
  });

  test('should create a logger', async () => {
    const kernel = new Kernel();

    expect(kernel.logger).toBeDefined();
    expect(kernel.logger).toHaveProperty('debug');
    expect(kernel.logger).toHaveProperty('info');
    expect(kernel.logger).toHaveProperty('warn');
    expect(kernel.logger).toHaveProperty('error');

    await kernel.stop();
  });

  test('should create a context', async () => {
    const kernel = new Kernel();

    expect(kernel.context).toBeDefined();
    expect(kernel.context).toBeInstanceOf(Context);

    await kernel.stop();
  });

  test('should define the "' + KERNEL_BINDING + '" binding', async () => {
    const kernel = new Kernel();

    expect(kernel.context.contains(KERNEL_BINDING)).toBe(true);
    expect(kernel.context.getSync(KERNEL_BINDING)).toBe(kernel);

    await kernel.stop();
  });

  describe('Module Registration', () => {
    test('should register module providers', async () => {
      const kernel = new Kernel();

      @Service()
      class MyService {}

      @Module({
        providers: [MyService],
      })
      class ModuleWithService {}

      kernel.register([ModuleWithService]);

      expect(kernel.context.contains(MyService.name)).toBe(true);
      expect(kernel.context.getSync(MyService.name)).toBeInstanceOf(MyService);

      await kernel.stop();
    });

    test('should inject dependencies', async () => {
      const kernel = new Kernel();

      @Service()
      class ServiceA {}

      @Service()
      class ServiceB {
        constructor(@Inject(ServiceA) readonly serviceA: ServiceA) {}
      }

      @Module({
        providers: [ServiceA, ServiceB],
      })
      class ModuleWithServices {}

      kernel.register([ModuleWithServices]);

      expect(kernel.context.contains(ServiceA.name)).toBe(true);
      expect(kernel.context.contains(ServiceB.name)).toBe(true);
      expect(kernel.context.getSync(ServiceA.name)).toBeInstanceOf(ServiceA);
      expect(kernel.context.getSync(ServiceB.name)).toBeInstanceOf(ServiceB);
      expect(kernel.context.getSync(ServiceB.name)).toHaveProperty('serviceA');
      expect(
        kernel.context.getSync<ServiceB>(ServiceB.name).serviceA,
      ).toBeInstanceOf(ServiceA);

      await kernel.stop();
    });
  });

  describe('Module Hooks', () => {
    test('should call the "onBoot" hook', done => {
      const kernel = new Kernel();

      @Module()
      class ModuleWithOnBootHook implements IModule {
        async onBoot(injectedKernel: IKernel): Promise<void> {
          expect(injectedKernel).toBe(kernel);
        }
      }

      kernel.register([ModuleWithOnBootHook]);
      kernel
        .boostrap()
        .then(() => kernel.stop())
        .then(() => done());
    });

    test('should call the "onStart" hook', done => {
      const kernel = new Kernel();

      @Module()
      class ModuleWithOnStartHook implements IModule {
        async onStart(injectedKernel: IKernel): Promise<void> {
          expect(injectedKernel).toBe(kernel);
        }
      }

      kernel.register([ModuleWithOnStartHook]);
      kernel
        .boostrap()
        .then(() => kernel.start())
        .then(() => kernel.stop())
        .then(() => done());
    });

    test('should call the "onStop" hook', done => {
      const kernel = new Kernel();

      @Module()
      class ModuleWithOnStopHook implements IModule {
        async onStop(injectedKernel: IKernel): Promise<void> {
          expect(injectedKernel).toBe(kernel);
        }
      }

      kernel.register([ModuleWithOnStopHook]);
      kernel
        .boostrap()
        .then(() => kernel.start())
        .then(() => kernel.stop())
        .then(() => done());
    });
  });

  describe('Container Interactions', () => {
    test('should resolve injected service', async () => {
      const kernel = new Kernel();

      @Service()
      class MyService {}

      @Module({
        providers: [MyService],
      })
      class ModuleWithProvider {}

      kernel.register([ModuleWithProvider]);

      expect(await kernel.get(MyService)).toBeInstanceOf(MyService);
    });

    test('should "create" a class with injectables', async () => {
      const kernel = new Kernel();

      @Service()
      class MyService {}

      @Module({
        providers: [MyService],
      })
      class ModuleWithService {}

      kernel.register([ModuleWithService]);

      class MyClass {
        constructor(
          @Inject(MyService) readonly myService: MyService,
          readonly one: number,
          readonly two: number,
        ) {}
      }

      const myClass = await kernel.create<MyClass>(MyClass, [1, 2]);

      expect(myClass).toBeInstanceOf(MyClass);
      expect(myClass).toHaveProperty('myService');
      expect(myClass.myService).toBeInstanceOf(MyService);
      expect(myClass.one).toBe(1);
      expect(myClass.two).toBe(2);

      await kernel.stop();
    });
  });

  describe('Providers', () => {
    test('should resolve a provider by value', async () => {
      const kernel = new Kernel();

      class TheProduct {}

      @Service(TheProduct)
      class MyService implements Provider<TheProduct> {
        value(): ValueOrPromise<TheProduct> {
          return new TheProduct();
        }
      }

      @Module({
        providers: [MyService],
      })
      class ModuleWithProvider {}

      kernel.register([ModuleWithProvider]);

      expect(kernel.context.contains(`providers.${MyService.name}`)).toBe(true);
      expect(kernel.context.getSync(TheProduct.name)).toBeInstanceOf(
        TheProduct,
      );

      const resolve1 = kernel.context.getSync(TheProduct.name);
      const resolve2 = kernel.context.getSync(TheProduct.name);

      expect(resolve1).toBe(resolve2);

      await kernel.stop();
    });
  });

  describe('Logger', () => {
    test('should inject a logger', async () => {
      const kernel = new Kernel();

      @Service()
      class MyService {
        constructor(@Logger() readonly logger: ILogger) {}
      }

      @Module({
        providers: [MyService],
      })
      class ModuleWithService {}

      kernel.register([ModuleWithService]);

      expect(kernel.context.contains(MyService.name)).toBe(true);
      const product = await kernel.context.get<MyService>(MyService.name);

      expect(product).toBeInstanceOf(MyService);
      expect(product).toHaveProperty('logger');

      expect(product.logger).toHaveProperty('debug');
      expect(product.logger).toHaveProperty('info');
      expect(product.logger).toHaveProperty('warn');
      expect(product.logger).toHaveProperty('error');

      await kernel.stop();
    });
  });

  describe.skip('Error Management', () => {
    test('should stop booting on error', () => {
      const kernel = new Kernel();

      @Module()
      class ModuleWithError implements IModule {
        async onBoot(): Promise<void> {
          throw new Error('An error');
        }
      }

      kernel.register([ModuleWithError]);

      expect(kernel.boostrap()).resolves.toBe(false);
    });
  });
});
