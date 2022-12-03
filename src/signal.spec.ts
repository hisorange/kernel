import { Kernel } from './kernel';

describe.skip('Signal management', () => {
  test('should register SIG handlers', async () => {
    const sigIntListeners = process.listenerCount('SIGINT');
    const sigTermListeners = process.listenerCount('SIGTERM');

    const kernel = new Kernel();
    await kernel.boostrap();

    expect(process.listenerCount('SIGINT')).toBeGreaterThan(sigIntListeners);
    expect(process.listenerCount('SIGTERM')).toBeGreaterThan(
      sigTermListeners + 1,
    );

    await kernel.stop();

    expect(process.listenerCount('SIGINT')).toBe(sigIntListeners);
    expect(process.listenerCount('SIGTERM')).toBe(sigTermListeners);
  });
});
