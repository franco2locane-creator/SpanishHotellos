import { supabase } from '@/lib/supabase';
import { toApiCallError, ApiCallError } from './apiError';
import { checkFunctionsVersion } from './functionsVersion';

export { ApiCallError };

type DeleteAccountResult = {
  success: true;
  _version?: string;
};

/**
 * Deletes the caller's account server-side (auth user + every user-owned
 * row, via ON DELETE CASCADE — see supabase/functions/delete-account).
 * Throws ApiCallError on any failure; callers must treat that as "nothing
 * was deleted" — the account and all data are still intact.
 */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<DeleteAccountResult>('delete-account', {});
  if (error) throw await toApiCallError(error);
  if (!data) throw new ApiCallError('Empty response from delete-account function', 'server');
  checkFunctionsVersion('delete-account', data._version);
}
