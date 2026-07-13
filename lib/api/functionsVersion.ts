// Must match supabase/functions/_shared/version.ts — bump both together.
// See DEPLOYMENT.md.
export const EXPECTED_FUNCTIONS_VERSION = '2026-07-13.1';

/** Logs the server's reported function version and warns loudly on drift. */
export function checkFunctionsVersion(fnName: string, serverVersion: unknown): void {
  if (serverVersion == null) {
    console.warn(`[${fnName}] response carried no _version — is the deployed function stale?`);
    return;
  }
  if (serverVersion !== EXPECTED_FUNCTIONS_VERSION) {
    console.warn(
      `[${fnName}] deployed version "${serverVersion}" does not match client-expected ` +
      `"${EXPECTED_FUNCTIONS_VERSION}" — supabase/functions/${fnName} (or _shared/) probably ` +
      `needs "supabase functions deploy ${fnName}". See DEPLOYMENT.md.`,
    );
  } else {
    console.log(`[${fnName}] function version ${serverVersion} (matches client)`);
  }
}
