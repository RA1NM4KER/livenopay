# Multi-User Setup

NewinMeter is a multi-user MVP: each person signs in with Supabase Auth, connects their own
LiveMopay account with their LiveMopay email and password, and sees only their own dashboard,
exports, and assistant answers. This document covers the hosted multi-user setup. For the
legacy single-user local CLI (Python, no Supabase Auth), see `README.md`'s "Legacy Local Setup"
section.

## 1. Architecture overview

```
Supabase sign-in (magic link)
  -> middleware refreshes the session cookie, redirects unauthenticated users to /login
  -> authenticated, no LiveMopay connection -> redirected to /connect
  -> POST /api/livemopay/connect: email + password -> Firebase ID/refresh token -> account discovery
  -> (if multiple accounts) POST /api/livemopay/select-account finishes the connection
  -> refresh token encrypted (AES-256-GCM) and stored in livemopay_connections; password discarded
  -> POST /api/sync: resolves the caller's connection, decrypts the refresh token server-side,
     fetches the ledger, upserts energy_rows scoped by connection_id
  -> Postgres trigger recomputes that connection's rollups + dashboard_summary row only
  -> dashboard/data table/export/assistant all read through Supabase RLS, scoped to auth.uid()
```

Ownership model: `livemopay_connections.user_id` is the only place a Supabase Auth id is stored.
Every ledger/rollup table carries `connection_id` only (not a duplicated `user_id`), so there is
no way for a row's owner and its connection's owner to disagree. RLS policies resolve ownership
through `public.owns_livemopay_connection(connection_id)`, a narrow `SECURITY DEFINER` function --
`livemopay_connections` itself has no authenticated read policy, since it holds encrypted refresh
tokens and is never queried directly from the browser.

## 2. Required Supabase configuration

- A Supabase project with Auth enabled.
- Email provider enabled for magic-link sign-in (Authentication -> Providers -> Email).
- The `pgcrypto` extension (already enabled by the first migration).

## 3. Required Vercel environment variables

Set these in the Vercel project (Production and Preview):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LIVENOPAY_FIREBASE_API_KEY=
LIVENOPAY_WEB_BASE_URL=https://app.propertywallet.co.za
LIVENOPAY_WEB_PORTAL_ORIGIN=https://app.livewalletportal.co.za
LIVENOPAY_WEB_APP_FLAVOR=livemopay
LIVENOPAY_TOKEN_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=https://your-deployment.vercel.app
OPENAI_API_KEY=        # optional, enables the assistant
OPENAI_MODEL=gpt-4.1-mini
```

Do not set `LIVENOPAY_WEB_EMAIL`, `LIVENOPAY_WEB_PASSWORD`, `LIVENOPAY_ACCOUNT_ID`,
`LIVENOPAY_COMPANY_ID`, or `LIVENOPAY_PROPERTY_ID` in the hosted environment -- the multi-user
flow never reads per-user identity from environment variables.

## 4. Generating LIVENOPAY_TOKEN_ENCRYPTION_KEY

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

This must decode to exactly 32 bytes (AES-256). Store it only in your deployment's environment
variables and local `.env.local` -- never commit it. Rotating this key invalidates every stored
refresh token; anyone connected would need to disconnect and reconnect.

## 5. Supabase Auth redirect URLs

In Supabase Dashboard -> Authentication -> URL Configuration, add:

```
http://localhost:3000/auth/callback        (local development)
https://your-deployment.vercel.app/auth/callback   (production)
```

## 6. Migration order

Apply every file in `supabase/migrations` in timestamp order. The four migrations added for
multi-user support, and where the legacy-owner backfill fits between them:

```
20260725000000_livenopay_connections.sql            <- livemopay_connections table + ownership function
20260725010000_livenopay_ownership_columns.sql       <- nullable connection_id on 6 tables
20260725015000_livenopay_legacy_backfill_function.sql <- transactional backfill RPC

    --- run scripts/backfill-legacy-owner.ts here (see section 7) ---

20260725020000_livenopay_enforce_ownership.sql        <- NOT NULL, PK/unique swaps, RLS cutover
20260725030000_livenopay_connection_scoped_summary.sql <- dashboard_summary PK swap + rollup rewrite
```

The last two migrations will fail (by design -- a `NOT NULL` violation) if any row still has a
null `connection_id`. Do not apply them until the backfill script reports zero remaining
null-owner rows.

If you are setting up a brand-new project with no existing ledger data, you can skip the backfill
script and apply all migrations straight through -- there's nothing to backfill.

## 7. Legacy owner backfill steps

For an existing deployment with production data already in Supabase:

1. Apply migrations through `20260725015000_livenopay_legacy_backfill_function.sql`.
2. Create (or identify) the Supabase Auth user who should own the existing data -- sign up
   through `/login` once, or create the user directly in the Supabase dashboard.
3. Set in `.env.local`:
   ```
   LEGACY_OWNER_USER_ID=<that user's id>
   LEGACY_OWNER_LIVEMOPAY_EMAIL=<their LiveMopay email, for labeling only -- not a credential>
   ```
4. Dry run first (prints counts, makes no changes):
   ```
   npm run backfill:legacy-owner
   ```
5. Apply:
   ```
   npm run backfill:legacy-owner -- --confirm
   ```
6. Confirm the script prints "OK: every row now has an owner."
7. Apply the remaining two migrations.
8. Sign in as the legacy owner and visit `/connect` to attach real LiveMopay credentials to the
   same connection row the backfill created (it reuses that row instead of creating a second one).

The script is idempotent (safe to re-run), refuses to run without `--confirm`, refuses to run if
either required env var is missing, refuses to guess the owner (verifies the Supabase user exists
first), and never deletes rows.

## 8. Local development setup

```
npm install
cp .env.example .env.local
# fill in the "Hosted multi-user configuration" section
npm run dev
```

Apply migrations to your Supabase project (dashboard SQL editor, or the Supabase CLI) in the
order listed in section 6.

## 9. Production deployment steps

1. Set all Vercel environment variables from section 3.
2. Apply migrations to the production Supabase project (section 6), including the backfill if
   there's existing data to migrate (section 7).
3. Add the production redirect URL in Supabase Auth settings (section 5).
4. Deploy.

## 10. Manual verification checklist

- [ ] Sign up with a new email at `/login`, confirm redirect to `/connect` after clicking the
      magic link.
- [ ] Connect a LiveMopay account with a valid email/password; confirm redirect to `/` afterward.
- [ ] If the account has more than one discovered LiveMopay account, confirm the picker shows
      only labels (no internal ids), and selecting one completes the connection.
- [ ] Run a sync; confirm the dashboard shows data.
- [ ] Create a second Supabase user, connect a different LiveMopay account, sync it, and confirm
      neither user's dashboard/table/export/assistant shows the other user's data.
- [ ] Disconnect; confirm the dashboard/data table still show historical data (nothing deleted),
      but the connection status shows disconnected.
- [ ] Reconnect the same LiveMopay account; confirm history stays intact under the same
      connection (no duplicate rows).
- [ ] Trigger a sync failure (e.g. temporarily wrong LiveMopay password on a test account);
      confirm a subsequent sync attempt is not permanently blocked.
- [ ] Start two syncs for two different users at the same time; confirm both succeed
      independently.
- [ ] Sign out; confirm `/`, `/data`, and every `/api/*` route used by the dashboard reject the
      request (redirect or 401) when unauthenticated.

## 11. Rollback guidance

Schema: each migration in this set is additive or reversible by a corresponding down-migration
you write by hand if needed (Supabase's migration tooling here doesn't auto-generate down
migrations). The safest rollback for the RLS/ownership migrations is to restore from a Supabase
point-in-time backup taken before applying them, rather than attempting to hand-write reverse
migrations against live data.

Application: this is a standard Vercel deployment -- redeploy the previous build/commit to roll
back the app code independently of the database.

## 12. Security assumptions

- LiveMopay passwords are used exactly once per connect/reconnect request and never stored,
  logged, or cached.
- Refresh tokens are encrypted at rest (AES-256-GCM) and only decrypted server-side, immediately
  before use, inside the sync route.
- ID tokens are never persisted -- every sync re-derives one from the stored refresh token.
- `livemopay_connections` has no authenticated read/write RLS policy; all access goes through
  `/api/livemopay/*`, which resolves `auth.uid()` from the session cookie before touching it.
- The service-role key is only used server-side, in modules that import `"server-only"`.

## 13. Remaining limitations

- One active LiveMopay connection per Supabase user (by design, for this MVP). The schema
  (`connection_id`-only ownership, no `user_id` duplicated on ledger rows) does not require a
  rewrite to relax this later -- only the partial unique index on `livemopay_connections(user_id)`
  needs to change.
- Full historical sync (`mode: "full"`) runs as one synchronous request; there is no date-chunked
  import yet. If a real account's full history turns out to exceed Vercel's request duration
  limit, that's the next thing to build (see section 14).
- No automated tests exist for the LiveMopay discovery response shape, since it hasn't been
  observed against a real multi-account login (see section 14).

## 14. LiveMopay discovery uncertainties

`discoverLiveMopayAccounts` (in `src/lib/livenopay-web.ts`) calls `GET /mobile/` with
discovery-only headers (no `accountid`) and parses the response defensively -- any array (or
single object) of records exposing an id-like field, with company/property ids resolved from
either the response or the JWT claims. This path was previously unreachable in the codebase (the
old code required `LIVENOPAY_ACCOUNT_ID` even to call the discovery endpoint), so its actual
response shape against a real account has not been observed. If accounts aren't discovered
correctly:

1. Add a temporary log (top-level keys, field names, array length, value types only -- never the
   full payload) around the `getJson` call in `discoverLiveMopayAccounts`.
2. Run `/connect` once against a real account.
3. Adjust the field-name fallbacks in `readIdLikeField` calls to match what's actually returned.

Never log the full discovery payload, the ID token, or the refresh token.

## 15. Disconnecting or revoking a connection

In-app: the connection status control in the header (when connected) has a "Disconnect" action,
or `POST /api/livemopay/disconnect` directly. This nulls the encrypted refresh token fields and
sets `status = 'disconnected'`; ledger history is untouched. Reconnecting reuses the same
`connection_id`.

To fully revoke access outside the app (e.g. the LiveMopay password changed), disconnecting is
sufficient -- the stored refresh token is deleted, not just marked unused.

## 16. Token rotation handling

Every sync calls `refreshLiveMopaySession(refreshToken)` before fetching the ledger (id tokens
are never cached). If Firebase returns a different refresh token than the one that was sent, the
new one is encrypted and written back to the connection row (`replaceConnectionRefreshToken`)
before the ledger fetch proceeds, so the old encrypted value is never left stored alongside a
newer, valid one.
