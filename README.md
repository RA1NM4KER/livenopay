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

This assumes local execution with Android platform tools available. The script looks for `adb` in this order:

1. `ADB_PATH`, if you set it
2. `adb` on your shell path
3. Android Studio's default macOS SDK path: `~/Library/Android/sdk/platform-tools/adb`

### Install ADB

ADB is the small Android command line tool that lets this project read and scroll the LiveMopay screen from your computer.

On macOS, the lightest setup is:

    brew install android-platform-tools

On Linux, install the platform tools package from your distro:

    sudo apt install android-sdk-platform-tools

For Fedora:

    sudo dnf install android-tools

For Arch:

    sudo pacman -S android-tools

On Windows:

1. download `SDK Platform-Tools for Windows` from Google's Android developer site
2. extract it somewhere simple, for example `C:\platform-tools`
3. add that folder to your Windows `Path`
4. or set `ADB_PATH` to the full executable path, for example `C:\platform-tools\adb.exe`

After installing, connect the phone and run:

    adb devices

If the phone asks whether to allow USB debugging, tap `Allow`. The device should show as `device`, not `unauthorized`.

### Recommended: use your Android phone

1. install LiveMopay on your Android phone and log in
2. connect the phone to your computer with USB
3. turn on Developer Options on the phone
4. turn on USB debugging
5. unlock the phone and tap `Allow` if it asks about USB debugging
6. open LiveMopay
7. tap the bottom `Ledger` tab
8. leave the app on the Ledger summary page, where the orange `Ledger` button is visible
9. click `Refresh capture` in this dashboard

Once capture starts, do not touch the phone until it finishes. The script is reading and scrolling the Android UI, so manual taps or scrolling can make it capture the wrong screen or miss rows.

### Advanced: use Android Studio emulator

Use this if you do not want to connect a real phone:

1. install Android Studio
2. create or start an Android emulator
3. install LiveMopay inside the emulator and log in
4. tap the bottom `Ledger` tab
5. leave the app on the Ledger summary page, where the orange `Ledger` button is visible
6. click `Refresh capture` in this dashboard

Once capture starts, do not touch the emulator until it finishes.

It is also okay if you already tapped the orange `Ledger` button and are looking at the list of individual electricity rows. The script tries to reset the app into the right place automatically:

1. if it starts inside the list of individual electricity rows, it taps the top-left back arrow
2. it opens the Ledger tab if needed
3. it taps the orange `Ledger` button
4. it verifies that transaction rows are visible before scanning

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

The goal is straightforward: get my electricity data out of a limited UI and into a format I can actually inspect and understand.
