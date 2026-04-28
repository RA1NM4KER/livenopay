# Electricity Ledger

**Your power. Your data. Your rules.**

LiveMopay currently doesn't let you download your data. It only shows data for the current month, and when a new month starts, the history is gone. If you want to understand your usage over time — spot trends, track tariff changes, see which days cost the most — you're stuck squinting at charts that barely work on mobile and can't tell you anything beyond the last 30 days.

This is the only way I found to get that data out.

It captures the in-app ledger from Android, syncs the rows to Supabase, and gives you a proper dashboard: usage, spend, balance, fixed charges, tariff changes, 30-minute interval breakdowns, and raw transaction history — going back as far as you've been syncing.

The intended setup is:

1. run the dashboard anywhere Next.js can deploy
2. run refresh locally on a machine with Android Studio emulator access
3. let Supabase sit between the two as the source of truth and rollup engine

## Architecture

Livenopay now separates ingestion from presentation:

- local machine: runs Android/ADB capture through `capture_livemopay.py`
- local machine: syncs the resulting `livemopay_energy.csv` to Supabase with `refresh_and_sync.py`
- Supabase: source of truth for dashboard reads
- deployed Next.js app: reads Supabase only and never triggers Android/ADB

There are no job queues, polling workers, remote command systems, or localhost dependencies for viewing the dashboard.

## Who Can Use This

This repo is set up as a personal deployable tool, not a shared hosted product.

If someone else wants to use it, they should run their own instance:

1. create their own Supabase project
2. apply the Supabase migration from this repo
3. deploy their own Next.js dashboard with their own Supabase read env vars
4. install LiveMopay in their own Android emulator or phone
5. run the local refresh command that captures their ledger and syncs it to Supabase

The deployed dashboard only reads Supabase. It does not know how to capture someone else's LiveMopay data, and it cannot trigger Android/ADB remotely.

To turn this into a product for multiple users, the architecture would need more work: authentication, per-user data isolation, a proper ingestion/onboarding story, and a backend that does not expose service-role access to clients. That is intentionally out of scope for this personal version.

## Supabase Schema

Apply the migration in:

    supabase/migrations/20260414000000_livenopay_energy.sql

They create:

- `energy_rows` with the same core shape as the CSV: `capture_dt`, `charge_label`, `period_dt`, `kwh`, `tariff`, `cost`, `balance`
- a natural unique key on `charge_label`, `period_dt`, `cost`, and `balance`
- `capture_runs` for sync metadata used by the dashboard's last synced indicator
- `energy_day_rollups`, `energy_hourly_rollups`, and `energy_interval_rollups` for dashboard metrics and charts
- `dashboard_summary` for last sync metadata and latest balance context

Apply both migrations in order:

    supabase/migrations/20260414000000_livenopay_energy.sql
    supabase/migrations/20260421000000_livenopay_rollups.sql

The unique key matches the existing local capture dedupe strategy, so rerunning sync is idempotent and avoids duplicate rows.

## Quick Start

1. Install dependencies:

   npm install

2. Create `.env.local` from `.env.example` and set:

   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...

3. Apply the migrations in Supabase:

   supabase/migrations/20260414000000_livenopay_energy.sql
   supabase/migrations/20260421000000_livenopay_rollups.sql

4. Install LiveMopay in an Android Studio emulator and log in.

5. Set your Android Studio emulator name in `.env.local`:

   LIVENOPAY_AVD_NAME=Your_AVD_Name

6. Refresh data through the emulator:

   npm run refresh:emulator

7. Start the dashboard:

   npm run dev

Open `http://localhost:3000`.

For the first run, leave the emulator logged into LiveMopay. The refresh command starts the emulator if needed, opens LiveMopay, captures ledger rows, syncs them to Supabase, and shuts the emulator down unless you pass `-- --no-shutdown`.

## Environment

For the deployed dashboard:

    SUPABASE_URL=...
    SUPABASE_ANON_KEY=...

For local sync:

    SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...

You can put these in `.env.local` for local development. Do not expose the service role key in the browser or deployed public client environment.

Optional emulator refresh settings:

    LIVENOPAY_AVD_NAME=Your_AVD_Name
    LIVENOPAY_PACKAGE_NAME=livemopay.co.za
    LIVENOPAY_ACTIVITY_NAME=com.example.property_wallet.MainActivity
    EMULATOR_CMD=/path/to/emulator
    ADB_PATH=/path/to/adb
    ADB_SERIAL=emulator-5554

Optional capture tuning:

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

## Refresh Data

The recommended path is the emulator wrapper:

    npm run refresh:emulator

Pass refresh options after `--`:

    npm run refresh:emulator -- --full
    npm run refresh:emulator -- --no-shutdown
    npm run refresh:emulator -- --skip-capture

On a local machine where LiveMopay is already open on a connected Android device or emulator, you can also run the lower-level command:

    python3 refresh_and_sync.py

or:

    npm run refresh

That command:

1. runs `python3 capture_livemopay.py`
2. reads the refreshed `livemopay_energy.csv`
3. upserts all CSV rows into Supabase
4. records a `capture_runs` row for last synced metadata
5. refreshes rollup tables through a capture-run trigger so dashboard reads stay lightweight

For a full local recapture before syncing:

    python3 refresh_and_sync.py --full

To sync the existing CSV without touching Android/ADB:

    python3 refresh_and_sync.py --skip-capture

## Data Semantics

Rows are normalized in `src/lib/csv.ts`, then summarized in `src/lib/analytics.ts`.

Analytics behavior is preserved:

- fixed daily charges are included in total spend
- fixed daily charges are excluded from kWh, hourly usage, and tariff analysis
- top-ups appear in raw data and balance history context
- top-ups are excluded from electricity spend

## Capture Setup

`capture_livemopay.py` remains local-only and still depends on ADB plus a connected Android phone or emulator. See [SETUP.md](./SETUP.md) for the Android setup.

The deployed dashboard cannot run capture. Refreshing data is a manual local command by design.

## Project Structure

- `src/app` - App Router pages
- `src/components/dashboard` - dashboard controls and insight sections
- `src/components/charts` - Recharts chart components
- `src/components/data` - Supabase-backed data table
- `src/components/ui` - shared presentation components
- `src/lib` - Supabase access, CSV normalization, filtering, formatting, and analytics
- `supabase/migrations` - database schema
- `capture_livemopay.py` - local Android capture
- `refresh_and_sync.py` - local capture and Supabase sync
