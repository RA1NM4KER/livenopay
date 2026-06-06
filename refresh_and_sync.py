import argparse
import csv
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from livenopay_web import dedupe_rows, fetch_ledger_rows, write_csv
CSV_PATH = Path("livemopay_energy.csv")
CAPTURE_SCRIPT = Path("capture_livemopay.py")
FIELDNAMES = [
    "capture_dt",
    "source_ts",
    "charge_label",
    "period_dt",
    "kwh",
    "water_kl",
    "tariff",
    "cost",
    "balance",
]
REQUIRED_FIELDNAMES = [field for field in FIELDNAMES if field not in {"source_ts", "water_kl"}]
BATCH_SIZE = 500


def read_dotenv(path: Path):
    if not path.exists():
        return

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


read_dotenv(Path(".env.local"))
CSV_PATH = Path(os.environ.get("LIVENOPAY_CSV_PATH", str(CSV_PATH)))


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def normalize_numeric_string(value, scale):
    trimmed = str(value or "").strip()
    if not trimmed:
        return f"{0:.{scale}f}"

    try:
        numeric = float(trimmed)
    except ValueError:
        return trimmed

    return f"{numeric:.{scale}f}"


def ledger_key(row):
    return (
        row["charge_label"].strip(),
        row["period_dt"].strip(),
        normalize_numeric_string(row["cost"], 2),
        normalize_numeric_string(row["balance"], 2),
    )


def supabase_config():
    read_dotenv(Path(".env.local"))

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise SystemExit(
            "Missing Supabase sync credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell or .env.local."
        )

    return url.rstrip("/") + "/rest/v1", key


def request_json(method, path, body=None, prefer=None):
    rest_url, key = supabase_config()
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    if prefer:
        headers["Prefer"] = prefer

    request = urllib.request.Request(
        rest_url + path,
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request) as response:
            content = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase {method} {path} failed with {error.code}: {detail}") from error

    return json.loads(content) if content else None


def start_capture_run(mode):
    response = request_json(
        "POST",
        "/capture_runs",
        [{"mode": mode, "status": "running"}],
        prefer="return=representation",
    )
    return response[0]["id"]


def finish_capture_run(run_id, status, rows_in_csv=None, rows_synced=None, error=None):
    payload = {
        "finished_at": now_iso(),
        "status": status,
        "rows_in_csv": rows_in_csv,
        "rows_synced": rows_synced,
        "error": error,
    }
    query_id = urllib.parse.quote(run_id, safe="")
    request_json(
        "PATCH",
        f"/capture_runs?id=eq.{query_id}",
        payload,
        prefer="return=minimal",
    )


def run_capture(full):
    command = ["python3", str(CAPTURE_SCRIPT)]
    if full:
        command.append("--full")

    print("Running local LiveMopay capture...", flush=True)
    subprocess.run(command, check=True)


def latest_csv_start_date():
    if not CSV_PATH.exists():
        return None

    latest_period = None
    with CSV_PATH.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            value = row.get("period_dt")
            if not value:
                continue
            if latest_period is None or value > latest_period:
                latest_period = value

    if latest_period is None:
        return None

    return latest_period.split(" ", 1)[0]


def run_web_capture(full):
    start_date = os.environ.get("LIVENOPAY_WEB_START_DATE")
    if not start_date:
        if full:
            start_date = "2000-01-01"
        else:
            start_date = latest_csv_start_date() or datetime.now().strftime("%Y-01-01")

    print(f"Fetching LiveMopay ledger from web API since {start_date}...", flush=True)
    fetched_rows = fetch_ledger_rows(start_date)
    if full or not CSV_PATH.exists():
        rows = fetched_rows
    else:
        cutoff = f"{start_date} 00:00"
        retained_rows = [row for row in read_csv_rows() if row["period_dt"] < cutoff]
        rows = dedupe_rows(retained_rows + fetched_rows)
    write_csv(rows, CSV_PATH)
    print(f"Wrote {len(rows)} rows to {CSV_PATH}", flush=True)


def read_csv_rows():
    if not CSV_PATH.exists():
        raise RuntimeError(f"{CSV_PATH} does not exist. Run capture before syncing.")

    rows = []
    seen = set()

    with CSV_PATH.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if not all(row.get(field) is not None and row.get(field) != "" for field in REQUIRED_FIELDNAMES):
                continue

            clean = {field: row.get(field, "") for field in FIELDNAMES}
            clean["water_kl"] = clean.get("water_kl") or "0"
            key = ledger_key(clean)
            if key in seen:
                continue

            seen.add(key)
            rows.append(clean)

    return rows


def upsert_rows(rows, run_id):
    synced_at = now_iso()
    total = 0
    on_conflict = urllib.parse.quote("charge_label,period_dt,cost,balance", safe=",")

    for index in range(0, len(rows), BATCH_SIZE):
        batch_seen = set()
        batch = []
        for row in rows[index : index + BATCH_SIZE]:
            key = ledger_key(row)
            if key in batch_seen:
                continue

            batch_seen.add(key)
            source_ts = row.get("source_ts", "").strip()
            batch.append(
                {
                    **{field: row[field] for field in REQUIRED_FIELDNAMES},
                    "water_kl": row.get("water_kl", "0") or "0",
                    **({"source_ts": source_ts} if source_ts else {}),
                    "sync_run_id": run_id,
                    "last_seen_at": synced_at,
                }
            )

        request_json(
            "POST",
            f"/energy_rows?on_conflict={on_conflict}",
            batch,
            prefer="resolution=merge-duplicates,return=minimal",
        )
        total += len(batch)
        print(f"Synced {total}/{len(rows)} rows", flush=True)

    return total


def main():
    parser = argparse.ArgumentParser(description="Run local LiveMopay capture and sync the CSV to Supabase.")
    parser.add_argument("--skip-capture", action="store_true", help="Sync the existing CSV without touching Android/ADB.")
    parser.add_argument("--full", action="store_true", help="Pass --full to capture_livemopay.py before syncing.")
    parser.add_argument("--source", choices=("adb", "web"), default="adb", help="Choose the ledger ingestion source.")
    args = parser.parse_args()

    supabase_config()
    mode = f"{args.source}-full" if args.full else args.source
    if args.skip_capture:
        mode = "csv-only"

    run_id = start_capture_run(mode)

    try:
        if not args.skip_capture:
            if args.source == "web":
                run_web_capture(args.full)
            else:
                run_capture(args.full)

        rows = read_csv_rows()
        synced = upsert_rows(rows, run_id)
        finish_capture_run(run_id, "success", rows_in_csv=len(rows), rows_synced=synced)
        print(f"Done. Synced {synced} rows from {CSV_PATH} to Supabase.", flush=True)
    except Exception as error:
        finish_capture_run(run_id, "failed", error=str(error))
        print(f"Sync failed: {error}", file=sys.stderr, flush=True)
        raise


if __name__ == "__main__":
    main()
