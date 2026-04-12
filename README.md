# Livenopay

A personal local-first tool for extracting and analyzing LiveMopay electricity usage, spend, and balance.

## Why

I built this because LiveMopay shows my electricity data, but does not make it easy to export, inspect, or analyze properly.

I wanted a clearer view of what I was actually spending, how much electricity I was using, how fixed daily charges affected my balance, and how tariffs changed over time.

So this repo pulls the history into a local dataset and gives me a calmer, more useful way to understand it.

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

Rows are normalized in `src/lib/csv.ts`, then summarized in `src/lib/analytics.ts`.

Daily fixed charges, such as reading and basic charges, are included in:

- spend totals
- daily spend
- balance analysis

They are excluded from:

- kWh totals
- hourly usage
- hourly energy spend
- tariff and kWh analysis

Top-ups are captured as `Top Up` rows in the data table and balance history. They are not counted as electricity spend.

## What the dashboard shows

The app is built to make the data easier to understand at a glance.

It includes:

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

The dashboard includes a `Refresh capture` button that calls `POST /api/capture`. That endpoint runs:

    python3 capture_livemopay.py

This assumes local execution with Android/ADB already set up for the capture script.

Before capture starts, make sure the LiveMopay history screen is open on the Android device or emulator and positioned near the newest entries.

If the phone, emulator, permissions, or ADB path are not ready, the dashboard still loads from the existing CSV and reports the capture failure in the UI.

The capture script loads the existing CSV before scanning, skips rows that are already present, appends newly discovered rows, and stops after several scrolls without new entries.

Use the dropdown beside `Refresh capture` for a full recapture. That runs:

    python3 capture_livemopay.py --full

Full recapture ignores the existing CSV and rebuilds it from the Android history it can scroll through.

You can also run capture manually:

    python3 capture_livemopay.py

Then refresh the browser. The app uses dynamic server rendering so it re-reads the CSV cleanly.

To rebuild the CSV from existing XML dumps without connecting to Android:

    python3 capture_livemopay.py --from-dumps

## How capture works

The Android app exposes transaction rows through the UI hierarchy, so this project does not rely on screenshots or OCR for the main extraction flow.

Instead, the capture script:

1. dumps the visible Android UI
2. parses transaction rows from the view XML
3. scrolls the history list
4. deduplicates overlapping rows
5. appends newly found entries to the CSV

This makes it possible to build and refresh a structured dataset from the in-app history screen.

## Project structure

- `src/app` - App Router pages and local API routes
- `src/components/dashboard` - dashboard controls and insight sections
- `src/components/charts` - Recharts chart components
- `src/components/data` - CSV data table
- `src/components/ui` - shared presentation components
- `src/lib` - parser, filtering, formatting, and analytics logic

## Notes

This is a personal tool built around my own account data and local workflow.

It is designed for local use first:

- the source of truth is the CSV in the repo
- capture is triggered from my own machine
- the dashboard remains usable even if capture is unavailable

The goal is simple: get my electricity data out of a limited UI and into a format I can actually inspect and understand.
