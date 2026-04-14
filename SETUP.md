# Livenopay Setup

This guide covers the local Android setup needed for refreshing `livemopay_energy.csv` from LiveMopay.

## Capture Flow

Capture is local-only. The deployed dashboard reads Supabase and does not run Android/ADB commands.

To capture fresh rows and sync them to Supabase, run this on the local machine with Android/ADB access:

    python3 refresh_and_sync.py

The refresh script runs:

    python3 capture_livemopay.py

This assumes local execution with Android platform tools available. The script looks for `adb` in this order:

1. `ADB_PATH`, if you set it
2. `adb` on your shell path
3. Android Studio's default macOS SDK path: `~/Library/Android/sdk/platform-tools/adb`

## Install ADB

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

## Recommended: Use Your Android Phone

1. install LiveMopay on your Android phone and log in
2. connect the phone to your computer with USB
3. turn on Developer Options on the phone
4. turn on USB debugging
5. unlock the phone and tap `Allow` if it asks about USB debugging
6. open LiveMopay
7. tap the bottom `Ledger` tab
8. leave the app on the Ledger summary page, where the orange `Ledger` button is visible
9. run `python3 refresh_and_sync.py`

Once capture starts, do not touch the phone until it finishes. The script is reading and scrolling the Android UI, so manual taps or scrolling can make it capture the wrong screen or miss rows.

## Advanced: Use Android Studio Emulator

Use this if you do not want to connect a real phone:

1. install Android Studio
2. create or start an Android emulator
3. install LiveMopay inside the emulator and log in
4. tap the bottom `Ledger` tab
5. leave the app on the Ledger summary page, where the orange `Ledger` button is visible
6. run `python3 refresh_and_sync.py`

Once capture starts, do not touch the emulator until it finishes.

## Starting Screen

It is okay if you already tapped the orange `Ledger` button and are looking at the list of individual electricity rows. The script tries to reset the app into the right place automatically:

1. if it starts inside the list of individual electricity rows, it taps the top-left back arrow
2. it opens the Ledger tab if needed
3. it taps the orange `Ledger` button
4. it verifies that transaction rows are visible before scanning

If the phone, emulator, permissions, or ADB path are not ready, the local refresh command reports the capture failure and the deployed dashboard keeps showing the last data that reached Supabase.

## Refresh Modes

The capture script loads the existing CSV before scanning, skips rows that are already present, appends newly discovered rows, and stops after several scrolls without new entries.

For a full recapture followed by sync, run:

    python3 refresh_and_sync.py --full

That passes `--full` to:

    python3 capture_livemopay.py --full

Full recapture ignores the existing CSV and rebuilds it from the Android history it can scroll through.

To run capture manually without syncing:

    python3 capture_livemopay.py

To sync the existing CSV without touching Android/ADB:

    python3 refresh_and_sync.py --skip-capture

To rebuild the CSV from existing XML dumps without connecting to Android:

    python3 capture_livemopay.py --from-dumps

## How Capture Works

The Android app exposes transaction rows through the UI hierarchy, so this project does not rely on screenshots or OCR for the main extraction flow.

Instead, the capture script:

1. dumps the visible Android UI
2. parses transaction rows from the view XML
3. scrolls the history list
4. deduplicates overlapping rows
5. appends newly found entries to the CSV

This makes it possible to build and refresh a structured dataset from the in-app history screen.
