// Shared safety net for any awaited persistence call whose failure or
// hang must never block the UI it's called from — used by every exercise's
// auto-save writes and by the vocab-deck freeze fix (see app/vocab/[deckId].tsx).
// On timeout or rejection, logs and resolves to `fallback` instead of
// propagating, so callers can always safely proceed.

export async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  // A late rejection after the timeout already won the race would otherwise
  // surface as an unhandled promise rejection — this observes it silently.
  promise.catch(() => {});
  try {
    return await Promise.race([promise, timeout]);
  } catch (e) {
    console.warn('withTimeout: guarded call rejected', e);
    return fallback;
  } finally {
    clearTimeout(timer!);
  }
}
