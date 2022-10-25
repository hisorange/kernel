import { Constructor, MetadataInspector } from '@loopback/context';
import EventEmitter2 from 'eventemitter2';
import debounce from 'lodash.debounce';
import { Inject } from '../decorator/inject.decorator.js';
import { Logger } from '../decorator/logger.decorator.js';
import { OnParams, ON_META_KEY } from '../decorator/on.decorator.js';
import { IKernel } from '../types/kernel.interface.js';
import { ILogger } from '../types/logger.interface.js';

export class EventService {
  constructor(
    @Logger()
    readonly logger: ILogger,
    @Inject(EventEmitter2)
    readonly eventBus: EventEmitter2,
    @Inject('Kernel')
    readonly kernel: IKernel,
  ) {}

  async register() {
    // Clear already hooked listeners
    this.eventBus.removeAllListeners();

    for (const key of this.kernel.context.findByTag<Constructor<unknown>>(
      'observer',
    )) {
      const observer = await key.getValue(this.kernel.context);
      const observerName = key.constructor.name;
      const metadatas = MetadataInspector.getAllMethodMetadata<OnParams>(
        ON_META_KEY,
        observer,
      );

      this.logger.debug(`Registering event handlers for [${observerName}]`);

      for (const method in metadatas) {
        if (Object.prototype.hasOwnProperty.call(metadatas, method)) {
          let handler = observer[method].bind(observer);
          const mdata = metadatas[method];

          // Debounce support
          if (mdata.options?.debounce) {
            handler = debounce(handler, mdata.options.debounce);
          }

          this.eventBus['on'](mdata.event, handler, mdata.options);

          this.logger.debug('Event handler [%s] registered', mdata.event);
        }
      }
    }
  }

  async deregister() {
    this.logger.debug('Deregistering event handlers');

    // Deregister event handlers.
    this.eventBus.removeAllListeners();
  }
}
