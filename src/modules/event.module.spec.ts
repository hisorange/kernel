import { Kernel } from '../kernel';
import { EventService } from '../services/event.service';
import { EventModule } from './event.module';

describe('Event Module', () => {
  test('should register the event service', () => {
    const kernel = new Kernel();
    kernel.register([EventModule]);

    expect(kernel.context.contains(EventService.name)).toBe(true);
  });
});
