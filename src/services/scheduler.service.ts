import { Constructor, MetadataInspector } from '@loopback/context';
import schedule from 'node-schedule';
import { Inject } from '../decorator/inject.decorator.js';
import { JobParams, JOB_META_KEY } from '../decorator/job.decorator';
import { Logger } from '../decorator/logger.decorator.js';
import { Service } from '../decorator/service.decorator.js';
import { IKernel } from '../types/kernel.interface.js';
import { ILogger } from '../types/logger.interface.js';

@Service()
export class SchedulerService {
  protected jobs = new Map<string, schedule.Job>();

  constructor(
    @Logger()
    readonly logger: ILogger,
    @Inject('Kernel')
    readonly kernel: IKernel,
  ) {}

  deregister() {
    this.jobs.forEach((job, name) => {
      this.logger.info('Canceling job [%s]', name);
      job.cancel();
    });
  }

  async register() {
    this.deregister();

    this.logger.debug('Registering decorators');

    for (const key of this.kernel.context.findByTag<Constructor<unknown>>(
      'scheduler',
    )) {
      const scheduler = await key.getValue(this.kernel.context);
      const metadata = MetadataInspector.getAllMethodMetadata<JobParams>(
        JOB_META_KEY,
        scheduler,
      );

      for (const method in metadata) {
        if (Object.prototype.hasOwnProperty.call(metadata, method)) {
          let name = scheduler.constructor.name + '::' + method;
          const timing = metadata[method].timing;

          if (metadata[method]?.name) {
            name = metadata[method].name;
          }

          const job = schedule.scheduleJob(
            name,
            timing,
            scheduler[method].bind(scheduler),
          );

          this.logger.info(
            'Job [%s] scheduled [%s] next execution [%s]',
            name,
            timing,
            job.nextInvocation().toISOString(),
          );
        }
      }
    }
  }
}
