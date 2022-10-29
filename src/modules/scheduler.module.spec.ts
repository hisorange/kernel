import { Kernel } from '../kernel';
import { SchedulerService } from '../services/scheduler.service';
import { SchedulerModule } from './scheduler.module';

describe('Scheduler Module', () => {
  test('should register the scheduler service', () => {
    const kernel = new Kernel();
    kernel.register([SchedulerModule]);

    expect(kernel.context.contains(SchedulerService.name)).toBe(true);
  });
});
