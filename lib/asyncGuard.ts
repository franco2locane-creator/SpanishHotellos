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

export type RetryResult<T> = { ok: true; value: T } | { ok: false };

/**
 * Retries a genuinely-thrown local write exactly once, then gives up —
 * for local SQLite writes specifically, where a thrown error (as opposed to
 * a hang, which `withTimeout` handles separately) is almost always
 * transient lock contention, not durable corruption. This is NOT a
 * dirty-flag/sync-queue mechanism: that pattern only rescues a write that
 * already succeeded locally but hasn't reached Supabase yet, a different
 * failure mode. A thrown local write never created a row to flag in the
 * first place, so a bounded retry is the correct (and only meaningful)
 * rescue here. Never throws — callers get a result object either way.
 */
export async function retryOnce<T>(fn: () => Promise<T>, context: string): Promise<RetryResult<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    console.warn(`retryOnce: first attempt failed for ${context}, retrying once`, e);
    try {
      return { ok: true, value: await fn() };
    } catch (e2) {
      console.error(`retryOnce: both attempts failed for ${context} — write lost for this attempt`, e2);
      return { ok: false };
    }
  }
}
