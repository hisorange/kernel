import { gracefulShutdown } from 'node-schedule';
import { Inject } from '../decorator/inject.decorator.js';
import { Module } from '../decorator/module.decorator.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { IModule } from '../types/module.interface.js';

@Module({
  providers: [SchedulerService],
})
export class SchedulerModule implements IModule {
  constructor(
    @Inject(SchedulerService)
    readonly service: SchedulerService,
  ) {}

  async onStart() {
    await this.service.register();
  }

  async onStop() {
    await gracefulShutdown();
  }
}
