import { withTimeout } from './asyncGuard';

describe('withTimeout', () => {
  it('resolves with the promise value when it settles before the timeout', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 1000, 'fallback');
    expect(result).toBe('ok');
  });

  it('resolves with the fallback when the promise rejects', async () => {
    const result = await withTimeout(Promise.reject(new Error('boom')), 1000, 'fallback');
    expect(result).toBe('fallback');
  });

  it('resolves with the fallback when the promise never settles within the timeout', async () => {
    jest.useFakeTimers();
    const never = new Promise<string>(() => {});
    const pending = withTimeout(never, 50, 'fallback');
    jest.advanceTimersByTime(50);
    const result = await pending;
    expect(result).toBe('fallback');
    jest.useRealTimers();
  });

  it('does not throw for a late rejection after timeout already resolved', async () => {
    jest.useFakeTimers();
    let rejectLate!: (e: Error) => void;
    const late = new Promise<string>((_, reject) => { rejectLate = reject; });
    const pending = withTimeout(late, 10, 'fallback');
    jest.advanceTimersByTime(10);
    const result = await pending;
    expect(result).toBe('fallback');
    rejectLate(new Error('too late'));
    jest.useRealTimers();
  });
});
