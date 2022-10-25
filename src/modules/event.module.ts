import { Inject } from '../decorator/inject.decorator.js';
import { Module } from '../decorator/module.decorator.js';
import { EventHandlerProvider } from '../providers/event-handler.provider.js';
import { EventService } from '../services/event.service.js';
import { IModule } from '../types/module.interface.js';

@Module({
  providers: [EventHandlerProvider, EventService],
})
export class EventModule implements IModule {
  constructor(
    @Inject(EventService)
    readonly eventService: EventService,
  ) {}

  async onStart() {
    await this.eventService.register();
  }

  async onStop() {
    this.eventService.deregister();
  }
}
