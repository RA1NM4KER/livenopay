# Livenopay

A local-first dashboard for electricity usage and spend captured from LiveMopay.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data

The app reads `livemopay_energy.csv` from the repo root on the server side. Expected columns:

- `capture_dt`
- `charge_label`
- `period_dt`
- `kwh`
- `tariff`
- `cost`
- `balance`

Rows are normalized in `src/lib/csv.ts`, then summarized in `src/lib/analytics.ts`.
Daily fixed charges, such as reading and basic charges, are included in spend totals and daily spend. They are excluded from kWh totals, hourly usage, hourly energy spend, and tariff/kWh analysis.
Top-ups are captured as `Top Up` rows in the data table and balance history. They are not counted as electricity spend.

## Capture Flow

The dashboard includes a `Refresh capture` button that calls `POST /api/capture`. That endpoint runs:

```bash
python3 capture_livemopay.py
```

This assumes local execution on your machine with Android/ADB set up exactly as the script expects. If the phone, emulator, permissions, or ADB path are not ready, the dashboard still loads from the existing CSV and reports the capture failure in the UI.
The capture script loads the existing CSV before scanning, skips rows that are already present, appends newly discovered rows, and stops after several scrolls without new entries.

Use the dropdown beside `Refresh capture` for a full recapture. That runs:

```bash
python3 capture_livemopay.py --full
```

Full recapture ignores the existing CSV and rebuilds it from the Android history it can scroll through.

You can also run the capture manually:

```bash
python3 capture_livemopay.py
```

Then refresh the browser. The app uses dynamic server rendering so it re-reads the CSV cleanly.

To rebuild the CSV from existing XML dumps without connecting to Android:

```bash
python3 capture_livemopay.py --from-dumps
```

## Structure

- `src/app` - App Router pages and local API routes
- `src/components/dashboard` - dashboard controls and insight sections
- `src/components/charts` - Recharts chart components
- `src/components/data` - CSV data table
- `src/components/ui` - shared presentation components
- `src/lib` - parser, filtering, formatting, and analytics logic
