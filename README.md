# Livenopay

A personal local-first tool for extracting and analyzing LiveMopay electricity usage, spend, and balance.

## Why

LiveMopay shows the data, but not in a way that is easy to export or analyze. Livenopay pulls the ledger into a local CSV and turns it into a calmer dashboard for spend, usage, balance, fixed charges, and tariffs.

## Run

    npm install
    npm run dev

Open `http://localhost:3000`.

## Data

The app reads `livemopay_energy.csv` from the repo root on the server side.

Expected columns:

- `capture_dt`
- `charge_label`
- `period_dt`
- `kwh`
- `tariff`
- `cost`
- `balance`

Rows are normalized in `src/lib/csv.ts`, then summarized in `src/lib/analytics.ts`. Fixed daily charges are included in spend and balance analysis, but excluded from pure kWh, hourly usage, and tariff analysis. Top-ups appear in the data table and balance history, but are not counted as electricity spend.

## Dashboard

The dashboard includes:

- total spend
- total kWh
- average daily spend
- average daily kWh
- latest balance
- highest spend day
- highest usage day
- daily spend trends
- daily usage trends
- cumulative spend
- hourly usage and spend patterns
- tariff band changes over time
- raw data table with filters

## Capture flow

The dashboard can refresh the CSV from LiveMopay with the `Refresh capture` button. Locally, that runs:

    python3 capture_livemopay.py

It needs ADB and either a connected Android phone or an Android emulator. The recommended path is a real Android phone with USB debugging enabled.

Use the dropdown beside `Refresh capture` for a full recapture. That runs:

    python3 capture_livemopay.py --full

Full recapture ignores the existing CSV and rebuilds it from the Android history it can scroll through. See [SETUP.md](./SETUP.md) for the full phone, emulator, and ADB setup.

You can also run capture manually:

    python3 capture_livemopay.py

Then refresh the browser. The app uses dynamic server rendering so it re-reads the CSV cleanly.

## Project structure

- `src/app` - App Router pages and local API routes
- `src/components/dashboard` - dashboard controls and insight sections
- `src/components/charts` - Recharts chart components
- `src/components/data` - CSV data table
- `src/components/ui` - shared presentation components
- `src/lib` - parser, filtering, formatting, and analytics logic

## Notes

This is a local-first personal tool:

- the source of truth is the CSV in the repo
- capture runs from the local machine
- the dashboard still works from the existing CSV if capture is unavailable
