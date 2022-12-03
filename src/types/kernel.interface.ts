import { BindingAddress, Constructor, ValueOrPromise } from '@loopback/context';
import { IContext } from './container.interface.js';
import { ExitCode } from './exit-code.enum.js';
import { ILogger } from './logger.interface.js';
import { IModule } from './module.interface.js';

export interface IKernel {
  /**
   * Global context with the 'app' identifier, every class uses this for injection.
   */
  readonly context: IContext;

  /**
   * Global base logger, every injection uses a child from this.
   */
  readonly logger: ILogger;

  /**
   * When the instance started.
   */
  readonly bootAt: Date;

  /**
   * Registers kernel modules
   */
  register(modules: Constructor<IModule>[]): void;

  /**
   * Bootstrap the kernel and invoke the modules
   */
  boostrap(): Promise<void>;

  /**
   * Invoke the ready hooks
   */
  start(): Promise<void>;

  /**
   * Stop the kernel and propagate the shutdown request to the modules
   */
  stop(): Promise<void>;

  /**
   * Inject a binding into the context, allows us to replace existing providers.
   */
  replace(key: BindingAddress | Constructor<object>, value: any): void;

  /**
   * Custom context resolver with support for the instance based resolution.
   *
   * @example kernel.make(ConnectionService)
   */
  get<T>(key: Constructor<T>): Promise<T>;
  get<T>(key: BindingAddress<T> | Constructor<object>): Promise<T>;

  /**
   * Create an instance from the given concrete in the kernel's resolution context
   */
  create<T>(
    concrete: Constructor<T>,
    nonInjectedArgs?: any[],
  ): ValueOrPromise<T>;

  /**
   * Kill the kernel and exit the process without graceful shutdown.
   */
  panic(summary: string, exitCode: ExitCode, context?: unknown): void;
}
