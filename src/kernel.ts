import {
  Binding,
  BindingAddress,
  BindingScope,
  BindingType,
  Constructor,
  Context,
  createBindingFromClass,
  instantiateClass,
  Reflector,
  ValueOrPromise,
} from '@loopback/context';
import chalk from 'chalk';
import { DepGraph } from 'dependency-graph';
import { default as timeout } from 'p-timeout';
import { KERNEL_BINDING } from './bindings.js';
import {
  IModuleMeta,
  MODULE_META_KEY,
  ModuleConcrete,
} from './decorator/module.decorator.js';

import { Exception } from './exceptions/exception.js';
import { createLogger } from './logger/create-logger.js';
import { IContext } from './types/container.interface.js';
import { ExitCode } from './types/exit-code.enum.js';
import { IKernel } from './types/kernel.interface.js';
import { ILogger } from './types/logger.interface.js';
import { IModule } from './types/module.interface.js';

/**
 * Kernel is responsible to manage the modules defined by the developer,
 * every dependency and application flow is managed by the start / stop
 * functionality.
 *
 * You can bootstrap the kernel without starting the application to create
 * a test environment where every resource is available without the
 * module onStart hooks.
 */
export class Kernel implements IKernel {
  readonly context: IContext;
  readonly logger: ILogger;
  readonly bootAt: Date = new Date();

  /**
   * Used to build the module loading graph, stores the startup dependency links
   * this way we can start and stop the modules in ideal order.
   */
  protected moduleGraph: DepGraph<void> = new DepGraph({
    circular: false,
  });

  /**
   * Initialize the kernel.
   */
  constructor(logger?: ILogger) {
    this.logger = logger || createLogger();
    this.logger.debug('Creating the context...');

    this.context = new Context('app');
    this.context.bind(KERNEL_BINDING).to(this);

    this.logger.info('Context is ready!');
  }

  /**
   * Hook to allow the kernel to register the signals it wants to listen to.
   */
  protected registerSignalHandlers(): void {
    process.once('SIGINT', this.handleShutdown.bind(this));
    process.once('SIGTERM', this.handleShutdown.bind(this));
  }

  /**
   * Process a shutdown request, this will stop the application and exit.
   */
  protected async handleShutdown(signal: NodeJS.Signals): Promise<void> {
    console.log('');

    if (this.logger) {
      this.logger.warn({ signal }, 'Received shutdown signal');
    } else {
      console.warn({ signal }, 'Received shutdown signal');
    }

    await this.stop();

    process.exit(ExitCode.OK);
  }

  /**
   * Resolve the moduleRef, and validate the output, referencing is used to
   * resolve circular dependencies, and the wrapper hides the concrete until
   * the JS definition is parsed.
   */
  protected resolveRef(
    module: ModuleConcrete,
    lead: string,
  ): Constructor<IModule> {
    if (typeof module === 'object' && module?.resolve) {
      module = module.resolve();
    }

    // Test for basic module expectations
    if (typeof module !== 'function') {
      throw new Exception(
        `Could not register module [${
          (module as unknown as Constructor<IModule>)?.name ?? module
        }] referenced by [${lead}]!`,
      );
    }

    return module;
  }

  /**
   * Register modules in the dependency container and module load graph.
   */
  protected discover(modules: ModuleConcrete[], lead: string = '__kernel__') {
    for (let module of modules.map(m => this.resolveRef(m, lead))) {
      const name = module.name;
      const key = `module.${name}`;

      if (!this.context.contains(key)) {
        // Register for dependency loading
        if (!this.moduleGraph.hasNode(key)) {
          this.moduleGraph.addNode(key);

          this.logger.debug('Discovered [%s] module by [%s]', name, lead);
        }

        // Bind the instance for hook executions
        this.context
          .bind(key)
          .toClass(module)
          .inScope(BindingScope.SINGLETON)
          .tag('module');

        // Check for the @Module decorator
        if (Reflector.hasOwnMetadata(MODULE_META_KEY, module)) {
          const meta: IModuleMeta = Reflector.getOwnMetadata(
            MODULE_META_KEY,
            module,
          );

          // Import sub modules
          if (meta.imports) {
            this.discover(meta.imports, name);
          }

          // Register dependencies
          if (meta.dependsOn) {
            this.discover(meta.dependsOn, name);

            for (let dep of meta.dependsOn.map(m => this.resolveRef(m, lead))) {
              const depKey = `module.${dep.name}`;

              this.logger.debug(
                { module: name, dependent: dep.name },
                'Dependency detected',
              );

              this.moduleGraph.addDependency(key, depKey);
            }
          }

          if (meta.providers) {
            for (const provider of meta.providers) {
              const binding = createBindingFromClass(provider);

              this.context.add(binding);

              // Implementation to support the provider injection by values
              // This allows the developer to register a provider by simply
              // adding the @Service(PRODUCED_CLASS) constructor to the meta
              // and when needed just use the @Inject(PRODUCED_CLASS) to
              // resolve the provider's value.
              if (binding.tagNames.includes('product')) {
                // Alias the value to the provider's product @Service(MyProvider)
                this.context.add(
                  new Binding(binding.tagMap.product).toAlias(binding.key),
                );
              } else {
                // Simplified object binding.
                // This allows us to use the @Inject(MyService) syntax
                this.context.add(
                  new Binding(provider.name).toAlias(binding.key),
                );
              }

              this.logger.debug(
                { binding: binding.key, tags: binding.tagNames },
                'Bound',
              );
            }
          }
        } else {
          throw new Exception(
            `Module [${name}] is missing the @Module decorator`,
          );
        }
      }
    }
  }

  /**
   * @inheritdoc
   */
  register(modules: Constructor<IModule>[]): void {
    this.logger.debug('Discovery started...');

    try {
      this.discover(modules);
      this.logger.info('Discovery successful!');
    } catch (error) {
      this.panic('Discovery failed!', ExitCode.DISCOVERY_FAILED, error);
    }
  }

  /**
   * Start the module with a timeout in case the module loops or waits too long
   */
  protected async doBootModule(
    binding: Binding<Constructor<IModule>>,
    module: IModule,
  ): Promise<void> {
    const value = binding.source.value as Constructor<IModule>;

    // Check for start hook
    if (module.onBoot) {
      await timeout(
        module
          .onBoot(this)
          .then(() => this.logger.debug({ name: value.name }, 'Module booted')),
        {
          message: `Module [${value.name}] could not finish it's boot in 60 seconds`,
          milliseconds: 60000,
        },
      );
    }
  }

  /**
   * @inheritdoc
   */
  async boostrap(): Promise<void> {
    this.registerSignalHandlers();

    this.logger.debug('Boostrap request received');
    this.logger.debug('Invoking the module bootstrap sequence...');

    const dependencies = this.moduleGraph.overallOrder(false);

    for (const key of dependencies) {
      const binding = this.context.getBinding<Constructor<IModule>>(key);

      await this.context
        .get<IModule>(binding.key)
        .then(module => this.doBootModule(binding, module))
        .catch(error =>
          this.panic(
            `Module [${key}] failed to bootstrap!`,
            ExitCode.BOOT_FAILED,
            error,
          ),
        );
    }

    this.logger.info("Bootstrap successful. Let's do this!");
  }

  /**
   * @inheritdoc
   */
  async start(): Promise<void> {
    const processes = [];

    // Propagate the onStart event, so the modules can register their late handles.
    // Unlike the on boot event, this does not have to be in any specific order.
    for (const binding of this.context.findByTag<any>('module')) {
      const module: IModule = await binding.getValue(this.context);

      if (module?.onStart) {
        processes.push(
          module
            .onStart(this)
            .then(() =>
              this.logger.debug(
                { name: binding.source.value.name },
                'Module started',
              ),
            )
            .catch(e =>
              this.panic(
                `Module [${binding.source.value.name}] had an unhandled exception in the start hook: [${e?.message}]`,
                ExitCode.START_FAILED,
                e,
              ),
            ),
        );
      }
    }

    await Promise.all(processes);

    this.logger.info('Startup procedure is finished, application is ready!');
  }

  /**
   * Stop the module with a timeout in case the module loops or waits too long
   */
  protected async doStopModule(
    binding: Readonly<Binding<Constructor<IModule>>>,
    module: IModule,
  ): Promise<void> {
    const value = binding.source.value as Constructor<IModule>;

    // Check for stop hook
    if (module.onStop) {
      this.logger.debug(
        { name: value.name },
        'Module stop requested, waiting for the module to finish...',
      );

      await timeout(
        module
          .onStop(this)
          .then(() =>
            this.logger.debug({ name: value.name }, 'Module stopped'),
          ),
        {
          milliseconds: 10_000,
          message: `Module [${value.name}] could not finish it's shutdown in 10 seconds`,
        },
      );
    } else {
      this.logger.debug({ name: value.name }, 'Module stopped');
    }
  }

  /**
   * @inheritdoc
   */
  async stop(): Promise<void> {
    this.logger.info('Stop request received');
    this.logger.debug('Invoking the graceful stop sequence...');

    const timeout = // Graceful shutdown timeout
      setTimeout(() => {
        this.panic(
          'Kernel could not shutdown in time, forcing it now!',
          ExitCode.FORCED_SHUTDOWN,
        );
      }, 10_000);

    const dependencies = this.moduleGraph.overallOrder(false).reverse();

    for (const key of dependencies) {
      const binding = this.context.getBinding(key);

      await this.context.get<IModule>(binding.key).then(module =>
        this.doStopModule(binding, module).catch(e => {
          this.panic(
            `Module [${binding.source.value.name}] failed to stop!`,
            ExitCode.STOP_FAILED,
            e,
          );
        }),
      );
    }

    this.logger.info('Shutdown sequence successful! See You <3');

    clearTimeout(timeout);

    process.off('SIGINT', this.handleShutdown.bind(this));
    process.off('SIGTERM', this.handleShutdown.bind(this));
  }

  /**
   * @inheritdoc
   */
  replace(
    key: BindingAddress | Constructor<object>,
    value: any,
    inContext?: IContext,
  ): void {
    // Binding key can be a class and we use the class's name to resolve it.
    if (typeof key === 'function') {
      if (key?.name) {
        key = key.name;
      }
    }

    if (!inContext) inContext = this.context;

    key = key as BindingAddress;

    if (!inContext.contains(key)) {
      throw new Exception(`Binding [${key}] is not registered`);
    }

    const binding = inContext.getBinding(key);

    // Clear the cached resolution.
    binding.refresh(inContext);

    switch (binding.type) {
      case BindingType.CONSTANT:
        binding.to(value);
        break;
      case BindingType.DYNAMIC_VALUE:
        binding.toDynamicValue(value);
        break;
      case BindingType.CLASS:
        binding.toClass(value);
        break;
      case BindingType.PROVIDER:
        binding.toProvider(value);
        break;
      case BindingType.ALIAS:
        return this.replace(binding.source.value as string, value);
    }
  }

  /**
   * @inheritdoc
   */
  async get<T>(
    key: BindingAddress<T> | Constructor<object>,
    inContext?: IContext,
  ): Promise<T> {
    // Binding key can be a class and we use the class's name to resolve it.
    if (typeof key === 'function') {
      if (key?.name) {
        key = key.name;
      }
    }

    key = key as BindingAddress;

    return (inContext ?? this.context).get<T>(key);
  }

  /**
   * @inheritdoc
   */
  create<T>(
    concrete: Constructor<T>,
    params?: any[],
    inContext?: IContext,
  ): ValueOrPromise<T> {
    return instantiateClass(
      concrete as Constructor<object>,
      inContext ?? this.context,
      undefined,
      params,
    ) as ValueOrPromise<T>;
  }

  /**
   * @inheritdoc
   */
  panic(summary: string, exitCode: ExitCode, errorContext?: unknown): void {
    console.error(chalk.red('Kernel panicked with message:'), summary);

    if (errorContext) {
      console.error(chalk.red('Captured error context:'), errorContext);
    }

    // Kill the process.
    process.exit(exitCode);
  }
}
