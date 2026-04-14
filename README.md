# Livenopay

A personal tool for extracting LiveMopay electricity ledger rows locally, syncing them to Supabase, and viewing usage, spend, balance, fixed charges, and tariffs in a deployed Next.js dashboard.

## Architecture

Livenopay now separates ingestion from presentation:

- local machine: runs Android/ADB capture through `capture_livemopay.py`
- local machine: syncs the resulting `livemopay_energy.csv` to Supabase with `refresh_and_sync.py`
- Supabase: source of truth for dashboard reads
- deployed Next.js app: reads Supabase only and never triggers Android/ADB

There are no job queues, polling workers, remote command systems, or localhost dependencies for viewing the dashboard.

## Supabase Schema

Apply the migration in:

    supabase/migrations/20260414000000_livenopay_energy.sql

It creates:

- `energy_rows` with the same core shape as the CSV: `capture_dt`, `charge_label`, `period_dt`, `kwh`, `tariff`, `cost`, `balance`
- a natural unique key on `charge_label`, `period_dt`, `cost`, and `balance`
- `capture_runs` for sync metadata used by the dashboard's last synced indicator

The unique key matches the existing local capture dedupe strategy, so rerunning sync is idempotent and avoids duplicate rows.

## Environment

For the deployed dashboard:

    SUPABASE_URL=...
    SUPABASE_ANON_KEY=...

For local sync:

    SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...

You can put these in `.env.local` for local development. Do not expose the service role key in the browser or deployed public client environment.

## Run the Dashboard

    npm install
    npm run dev

Open `http://localhost:3000`.

The dashboard and data table read from Supabase through `src/lib/energy-data.ts`. They do not read `livemopay_energy.csv` directly.

## Refresh Data

On the local machine that has Android/ADB configured, run:

    python3 refresh_and_sync.py

or:

    npm run refresh

That command:

1. runs `python3 capture_livemopay.py`
2. reads the refreshed `livemopay_energy.csv`
3. upserts all CSV rows into Supabase
4. records a `capture_runs` row for last synced metadata

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
