#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
REPO_DIR="${REPO_DIR:-${SCRIPT_DIR:h}}"

cd "$REPO_DIR"

if [[ -f ".env.local" ]]; then
  set -a
  source ".env.local"
  set +a
fi

AVD_NAME="${LIVENOPAY_AVD_NAME:-}"
PACKAGE_NAME="${LIVENOPAY_PACKAGE_NAME:-livemopay.co.za}"
ACTIVITY_NAME="${LIVENOPAY_ACTIVITY_NAME:-com.example.property_wallet.MainActivity}"
ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}"
EMULATOR_CMD="${EMULATOR_CMD:-$ANDROID_SDK_ROOT/emulator/emulator}"
ADB_CMD="${ADB_PATH:-$ANDROID_SDK_ROOT/platform-tools/adb}"
PYTHON_CMD="${PYTHON_CMD:-/opt/homebrew/bin/python3}"

FULL=0
SKIP_CAPTURE=0
SHUTDOWN=1

for arg in "$@"; do
  case "$arg" in
    --full)
      FULL=1
      ;;
    --skip-capture)
      SKIP_CAPTURE=1
      ;;
    --no-shutdown)
      SHUTDOWN=0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      echo "Usage: $0 [--full] [--skip-capture] [--no-shutdown]" >&2
      exit 1
      ;;
  esac
done

EMULATOR_SERIAL=""

find_running_emulator() {
  "$ADB_CMD" devices | awk '/^emulator-[0-9]+[[:space:]]+device$/ { print $1; exit }'
}

wait_for_boot() {
  local serial="$1"

  "$ADB_CMD" -s "$serial" wait-for-device >/dev/null

  until [[ "$("$ADB_CMD" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do
    sleep 2
  done

  until [[ "$("$ADB_CMD" -s "$serial" shell getprop init.svc.bootanim 2>/dev/null | tr -d '\r')" == "stopped" ]]; do
    sleep 2
  done

  sleep 8
}

start_emulator_if_needed() {
  EMULATOR_SERIAL="$(find_running_emulator || true)"

  if [[ -n "$EMULATOR_SERIAL" ]]; then
    echo "Using already running emulator: $EMULATOR_SERIAL"
    return
  fi

  if [[ -z "$AVD_NAME" ]]; then
    echo "Missing LIVENOPAY_AVD_NAME. Set it in .env.local to your Android Studio AVD name." >&2
    echo "List AVDs with: \"${EMULATOR_CMD}\" -list-avds" >&2
    exit 1
  fi

  echo "Starting emulator: $AVD_NAME"
  "$EMULATOR_CMD" "@${AVD_NAME}" >/tmp/livenopay-emulator.log 2>&1 &
  local emulator_pid=$!

  for _ in {1..90}; do
    EMULATOR_SERIAL="$(find_running_emulator || true)"
    if [[ -n "$EMULATOR_SERIAL" ]]; then
      break
    fi
    sleep 2
  done

  if [[ -z "$EMULATOR_SERIAL" ]]; then
    echo "Failed to detect emulator after launch. Check /tmp/livenopay-emulator.log" >&2
    kill "$emulator_pid" 2>/dev/null || true
    exit 1
  fi

  wait_for_boot "$EMULATOR_SERIAL"
}

ensure_app_open() {
  local serial="$1"

  echo "Opening LiveMopay"
  "$ADB_CMD" -s "$serial" shell am start -n "${PACKAGE_NAME}/${ACTIVITY_NAME}" >/dev/null
  sleep 10
}

run_refresh() {
  local args=()

  if [[ "$FULL" -eq 1 ]]; then
    args+=(--full)
  fi

  if [[ "$SKIP_CAPTURE" -eq 1 ]]; then
    args+=(--skip-capture)
  fi

  echo "Running refresh_and_sync.py ${args[*]:-}"
  if [[ -n "$EMULATOR_SERIAL" ]]; then
    export ADB_SERIAL="$EMULATOR_SERIAL"
  fi

  "$PYTHON_CMD" refresh_and_sync.py "${args[@]}"
}

shutdown_emulator() {
  local serial="$1"

  if [[ "$SHUTDOWN" -eq 1 ]]; then
    echo "Shutting down emulator: $serial"
    "$ADB_CMD" -s "$serial" emu kill || true
  fi
}

if [[ "$SKIP_CAPTURE" -eq 1 ]]; then
  run_refresh
else
  start_emulator_if_needed
  ensure_app_open "$EMULATOR_SERIAL"
  run_refresh
  shutdown_emulator "$EMULATOR_SERIAL"
fi
