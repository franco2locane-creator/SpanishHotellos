# Deployment checklist

Two things ship independently and neither is triggered by the other:

- **App code** (`app/`, `lib/`, `components/`, etc.) → ships via `eas build` + `eas submit`.
- **Backend code** (`supabase/functions/`, `supabase/migrations/`) → ships via the Supabase CLI. `git push` does **not** deploy either of these.

Forgetting the second one is exactly how the mock-exam roleplay bug on 2026-07-11
went undiagnosed for a moment — the fix turned out to be a pure client-side bug,
but the check itself (comparing local code against what's actually deployed)
is one you should run on every pass regardless, because it's easy to genuinely
have a stale function deployed and mistake it for something else.

## Before every session that touches `supabase/functions/`

- [ ] **Did you change any file under `supabase/functions/<name>/` or `supabase/functions/_shared/`?**
      If yes, that function needs `supabase functions deploy <name>` — editing
      `_shared/` silently affects every function that imports it, since each
      function bundles its own private copy of `_shared/` at deploy time. When
      in doubt, redeploy every function that imports the changed shared file.
- [ ] Bump `FUNCTIONS_VERSION` in `supabase/functions/_shared/version.ts` **and**
      `EXPECTED_FUNCTIONS_VERSION` in `lib/api/functionsVersion.ts` together.
      Every function response carries `_version`; the client logs
      `console.warn` the moment a deployed function's version doesn't match
      what the app expects — check device/EAS logs for that warning if
      something that used to work suddenly doesn't.
- [ ] **Did you change any file under `supabase/migrations/`?** Run `supabase db push`.
      If the remote migration history is out of sync with local (this has
      happened before — schema applied once outside the CLI, so the CLI's
      tracking table didn't know about it), `supabase migration list` shows
      the mismatch; use `supabase migration repair --status applied <version> --linked`
      to reconcile before pushing, rather than letting `db push` try to
      re-run already-applied SQL.

## Verifying a deploy actually landed

```bash
supabase functions list                  # version + updated_at per function
supabase migration list                  # local vs remote migration versions
```

Compare `updated_at` against `git log -1 -- supabase/functions/<name>/` for
the function in question — if the git commit is newer than the deploy
timestamp, it's stale.

There is no `supabase functions logs` in the CLI version this project uses
(2.109.1) — use the Dashboard's **Edge Functions → \<name\> → Logs / Invocations**
tabs instead. Note: Supabase has had platform incidents that degrade log
ingestion (see status.supabase.com) — an empty or sparse Invocations tab
during a known incident window is not proof requests didn't happen; treat it
as inconclusive, not as evidence.

## Deploying

```bash
supabase functions deploy roleplay
supabase functions deploy grade
supabase functions deploy placement
supabase functions deploy delete-account
supabase functions deploy award-daily-points
supabase db push
```
