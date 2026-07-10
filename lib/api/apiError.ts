import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

// Distinguishes "no internet" from "server rejected the request" so the UI
// can show the real failure reason instead of a generic "connection error"
// for every kind of failure.
export type ApiFailureKind = 'network' | 'server';

export class ApiCallError extends Error {
  kind: ApiFailureKind;
  status?: number;

  constructor(message: string, kind: ApiFailureKind, status?: number) {
    super(message);
    this.name = 'ApiCallError';
    this.kind = kind;
    this.status = status;
  }
}

/** Converts a Supabase Functions invoke() error into a classified ApiCallError. */
export async function toApiCallError(error: unknown): Promise<ApiCallError> {
  if (error instanceof FunctionsFetchError) {
    return new ApiCallError('No connection — check your signal and try again.', 'network');
  }
  if (error instanceof FunctionsRelayError) {
    return new ApiCallError('Could not reach the server — check your signal and try again.', 'network');
  }
  if (error instanceof FunctionsHttpError) {
    const status: number | undefined = error.context?.status;
    let serverMessage = '';
    try {
      const body = await error.context.json();
      serverMessage = typeof body?.error === 'string' ? body.error : '';
    } catch {
      // response body wasn't JSON — fall through to the generic message below
    }
    return new ApiCallError(
      serverMessage || `Server error${status ? ` (${status})` : ''}. Please try again.`,
      'server',
      status,
    );
  }
  return new ApiCallError(
    error instanceof Error ? error.message : 'Something went wrong. Please try again.',
    'network',
  );
}
