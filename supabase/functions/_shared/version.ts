// Bump this whenever ANY file under supabase/functions/ changes — including
// _shared/*, which every function bundles a private copy of at deploy time.
// See DEPLOYMENT.md. The client logs this on every call and warns if it
// doesn't match lib/api/functionsVersion.ts, so a forgotten deploy shows up
// immediately in device logs instead of surfacing as a mystery error.
export const FUNCTIONS_VERSION = '2026-07-11.2';
