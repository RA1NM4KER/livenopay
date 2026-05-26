# Electricity Ledger

**Your power. Your data. Your rules.**

LiveMopay currently doesn't let you download your data. If you want to understand your usage over time — spot trends, track tariff changes, see which days cost the most — you're stuck squinting at charts that barely work on mobile.

This project now pulls ledger history from LiveMopay's web app API, syncs the rows to Supabase, and gives you a proper dashboard: usage, spend, balance, fixed charges, tariff changes, 30-minute interval breakdowns, and raw transaction history — going back as far as you've been syncing.

The original Android/ADB capture path is still in the repo and still works, but it is no longer the recommended setup out of the box.

It also includes an in-app assistant on the dashboard that can answer grounded questions about the currently selected date range: comparisons, top usage periods, top-up activity, spikes, and balance patterns.

The intended setup is:

1. run the dashboard anywhere Next.js can deploy
2. run refresh locally against the LiveMopay web API
3. let Supabase sit between the two as the source of truth and rollup engine

## Architecture

Livenopay now separates ingestion from presentation:

- local machine: authenticates against the LiveMopay web stack and fetches ledger rows through `livenopay_web.py`
- local machine: writes `livemopay_energy.csv` and syncs it to Supabase with `refresh_and_sync.py`
- Supabase: source of truth for dashboard reads
- deployed Next.js app: reads Supabase only

Optional legacy path:

- local machine: can still capture through Android/ADB via `capture_livemopay.py`

There are no job queues, polling workers, remote command systems, or localhost dependencies for viewing the dashboard.

## Who Can Use This

This repo is set up as a personal deployable tool, not a shared hosted product.

If someone else wants to use it, they should run their own instance:

1. create their own Supabase project
2. apply the Supabase migration from this repo
3. deploy their own Next.js dashboard with their own Supabase read env vars
4. configure their own LiveMopay web credentials for local refresh
5. run the local refresh command that fetches their ledger and syncs it to Supabase

The deployed dashboard only reads Supabase. It does not know how to capture someone else's LiveMopay data, and it cannot trigger local capture remotely.

To turn this into a product for multiple users, the architecture would need more work: authentication, per-user data isolation, a proper ingestion/onboarding story, and a backend that does not expose service-role access to clients. That is intentionally out of scope for this personal version.

## Supabase Schema

Apply the migrations in `supabase/migrations` in timestamp order.

Current set:

    supabase/migrations/20260414000000_livenopay_energy.sql
    supabase/migrations/20260421000000_livenopay_rollups.sql
    supabase/migrations/20260523000000_livenopay_sort_timestamps.sql
    supabase/migrations/20260526090000_livenopay_source_ts.sql
    supabase/migrations/20260526143000_livenopay_latest_ledger_balance.sql
    supabase/migrations/20260526161500_livenopay_refresh_rollups_time_fix.sql
    supabase/migrations/20260526172000_livenopay_dashboard_summary_live.sql
    supabase/migrations/20260526174000_livenopay_unify_rollup_refresh.sql

They create and refine:

- `energy_rows` with the same core shape as the CSV: `capture_dt`, `charge_label`, `period_dt`, `kwh`, `tariff`, `cost`, `balance`
- a natural unique key on `charge_label`, `period_dt`, `cost`, and `balance`
- `capture_runs` for sync metadata used by the dashboard's last synced indicator
- `energy_day_rollups`, `energy_hourly_rollups`, and `energy_interval_rollups` for dashboard metrics and charts
- `dashboard_summary` for last sync metadata and latest balance context

The unique key matches the existing local capture dedupe strategy, so rerunning sync is idempotent and avoids duplicate rows.

## Quick Start

1. Install dependencies:

   npm install

2. Create `.env.local` from `.env.example` and set:

   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...

   If you want the dashboard assistant:

   OPENAI_API_KEY=...
   OPENAI_MODEL=gpt-4.1-mini

3. Apply all migrations in `supabase/migrations` to Supabase, in timestamp order.

   At minimum, do not stop at the first three files. The newer rollup and summary fixes are required for the current dashboard and refresh flow.

4. Add the LiveMopay web ingestion credentials to `.env.local`:

   LIVENOPAY_WEB_EMAIL=...
   LIVENOPAY_WEB_PASSWORD=...
   LIVENOPAY_FIREBASE_API_KEY=...
   LIVENOPAY_ACCOUNT_ID=...

   Optional if your JWT does not expose them or you want to override them:

   LIVENOPAY_COMPANY_ID=...
   LIVENOPAY_PROPERTY_ID=...

5. Refresh data through the web API:

   python3 refresh_and_sync.py --source web

6. Start the dashboard:

   npm run dev

Open `http://localhost:3000`.

If you prefer, the dashboard sync action already uses the web path. The local command above is the simplest first refresh because it makes the ingestion mode explicit.

## Web Ingestion Setup

The recommended local refresh path is:

    python3 refresh_and_sync.py --source web

That command:

1. authenticates against the LiveMopay web stack
2. refreshes the saved session if needed
3. fetches ledger rows from the web API
4. writes `livemopay_energy.csv`
5. upserts all rows into Supabase
6. records a `capture_runs` row for last synced metadata
7. refreshes rollup tables through the capture-run trigger so dashboard reads stay lightweight

For a full historical rebuild:

    python3 refresh_and_sync.py --source web --full

To sync the existing CSV without refetching:

    python3 refresh_and_sync.py --skip-capture

The script reads these web-ingestion values from `.env.local`:

    LIVENOPAY_WEB_EMAIL=you@example.com
    LIVENOPAY_WEB_PASSWORD=your-livewallet-password
    LIVENOPAY_FIREBASE_API_KEY=your-firebase-web-api-key
    LIVENOPAY_ACCOUNT_ID=715717
    LIVENOPAY_WEB_BASE_URL=https://app.propertywallet.co.za
    LIVENOPAY_WEB_PORTAL_ORIGIN=https://app.livewalletportal.co.za
    LIVENOPAY_WEB_SESSION_PATH=.secrets/livemopay_auth.json
    LIVENOPAY_WEB_AUTH_HEADER=Authorization
    LIVENOPAY_WEB_AUTH_SCHEME=Bearer
    LIVENOPAY_WEB_APP_FLAVOR=livemopay
    LIVENOPAY_COMPANY_ID=43
    LIVENOPAY_PROPERTY_ID=13835
    LIVENOPAY_WEB_REFRESH_BUFFER_SECONDS=300
    LIVENOPAY_WEB_START_DATE=2026-01-01
    LIVENOPAY_TIMEZONE=Africa/Johannesburg

The session file stores the web auth tokens locally so subsequent refreshes can reuse or refresh them automatically.

## Legacy Android / ADB Setup

Android capture is still available, but it is no longer the default recommendation.

Use it only if:

- the web API flow stops working for your account
- you want to keep the old capture path as a fallback
- you specifically want to verify the Android UI-derived ledger output

See [SETUP.md](./SETUP.md) for the full Android and emulator setup.

To use the legacy path directly:

    python3 refresh_and_sync.py --source adb

Or through the emulator wrapper:

npm run refresh:emulator

## Environment

For the deployed dashboard:

    SUPABASE_URL=...
    SUPABASE_ANON_KEY=...

For local sync:

    SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...

Optional dashboard assistant:

    OPENAI_API_KEY=...
    OPENAI_MODEL=gpt-4.1-mini

You can put these in `.env.local` for local development. Do not expose the service role key in the browser or deployed public client environment.

Recommended web API refresh settings:

    LIVENOPAY_WEB_EMAIL=you@example.com
    LIVENOPAY_WEB_PASSWORD=your-livewallet-password
    LIVENOPAY_FIREBASE_API_KEY=your-firebase-web-api-key
    LIVENOPAY_ACCOUNT_ID=715717

Optional web API overrides:

    LIVENOPAY_COMPANY_ID=43
    LIVENOPAY_PROPERTY_ID=13835
    LIVENOPAY_WEB_BASE_URL=https://app.propertywallet.co.za
    LIVENOPAY_WEB_PORTAL_ORIGIN=https://app.livewalletportal.co.za
    LIVENOPAY_WEB_SESSION_PATH=.secrets/livemopay_auth.json
    LIVENOPAY_WEB_AUTH_HEADER=Authorization
    LIVENOPAY_WEB_AUTH_SCHEME=Bearer
    LIVENOPAY_WEB_APP_FLAVOR=livemopay
    LIVENOPAY_WEB_REFRESH_BUFFER_SECONDS=300
    LIVENOPAY_WEB_START_DATE=2026-01-01
    LIVENOPAY_TIMEZONE=Africa/Johannesburg

Optional legacy emulator refresh settings:

    LIVENOPAY_AVD_NAME=Your_AVD_Name
    LIVENOPAY_PACKAGE_NAME=livemopay.co.za
    LIVENOPAY_ACTIVITY_NAME=com.example.property_wallet.MainActivity
    EMULATOR_CMD=/path/to/emulator
    ADB_PATH=/path/to/adb
    ADB_SERIAL=emulator-5554

Optional capture tuning and output locations:

    LIVENOPAY_CSV_PATH=livemopay_energy.csv
    LIVENOPAY_DUMPS_DIR=livemopay_dumps
    LIVENOPAY_CAPTURE_LOG=livemopay_capture.log
    LIVENOPAY_MAX_ITERATIONS=500
    LIVENOPAY_MAX_STAGNANT_ROUNDS=4
    LIVENOPAY_SCREEN_WAIT_ATTEMPTS=15
    LIVENOPAY_SCREEN_WAIT_SECONDS=2.0

## Run the Dashboard

    npm install
    npm run dev

Open `http://localhost:3000`.

The dashboard reads rollups through `src/lib/dashboard-data.ts` and the data table reads paginated rows through `src/lib/energy-data.ts`. Neither reads `livemopay_energy.csv` directly.

If `OPENAI_API_KEY` is configured, the dashboard assistant sends questions to the server-side `/api/assistant` route and answers using structured tools over your Supabase data for the currently selected date range. It does not run arbitrary SQL from the browser.

## Assistant

The assistant is a grounded analyst for the active dashboard date range. It only answers using the tool results below and never invents numbers or dates.

Available tools:

1. `get_scope_overview` - totals, peaks, balance, and generated insights for the active range
2. `get_balance_runout` - estimate when the current balance runs out and whether it covers month-end
3. `compare_previous_period` - compare the active range to the immediately preceding range of equal length
4. `compare_calendar_months` - compare the latest calendar month in scope to the prior month and return month-by-month breakdowns
5. `get_top_days` - highest days by spend, usage, or average tariff
6. `get_top_hours` - highest hours by spend or usage
7. `explain_day` - explain a single day with daily rollups plus top half-hour intervals
8. `get_recent_topups` - list recent top-ups in the active range

These tools read Supabase rollups and export rows only, so responses stay consistent with the dashboard tables and charts.

## Refresh Data

Recommended:

    python3 refresh_and_sync.py --source web

Full rebuild from the web API:

    python3 refresh_and_sync.py --source web --full

Sync the existing CSV only:

    python3 refresh_and_sync.py --skip-capture

Legacy Android / ADB refresh:

    python3 refresh_and_sync.py --source adb

Legacy emulator wrapper:

    npm run refresh:emulator

Pass emulator wrapper options after `--`:

    npm run refresh:emulator -- --full
    npm run refresh:emulator -- --no-shutdown
    npm run refresh:emulator -- --skip-capture

## Data Semantics

Rows are normalized in `src/lib/csv.ts`, then summarized in `src/lib/analytics.ts`.

Analytics behavior is preserved:

- fixed daily charges are included in total spend
- fixed daily charges are excluded from kWh, hourly usage, and tariff analysis
- top-ups appear in raw data and balance history context
- top-ups are excluded from electricity spend

## Capture Setup

`capture_livemopay.py` remains local-only and still depends on ADB plus a connected Android phone or emulator. It is now a fallback path rather than the default setup. See [SETUP.md](./SETUP.md) for the Android setup.

The deployed dashboard cannot run capture. Refreshing data is a manual local command by design.

## Project Structure

- `src/app` - App Router pages
- `src/app/api/assistant` - server-side assistant route
- `src/components/assistant` - dashboard assistant launcher and dialog UI
- `src/components/dashboard` - dashboard controls and insight sections
- `src/components/charts` - Recharts chart components
- `src/components/data` - Supabase-backed data table
- `src/components/ui` - shared presentation components
- `src/lib/assistant` - assistant prompt, tool loop, and grounded analytics tools
- `src/lib` - Supabase access, CSV normalization, filtering, formatting, and analytics
- `supabase/migrations` - database schema
- `livenopay_web.py` - local web API login, session refresh, and ledger fetch
- `capture_livemopay.py` - local Android capture
- `refresh_and_sync.py` - local capture and Supabase sync
