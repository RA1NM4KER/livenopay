import csv
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

ADB = str(Path.home() / "Library/Android/sdk/platform-tools/adb")
OUT_DIR = Path("livemopay_dumps")
OUT_DIR.mkdir(exist_ok=True)
CSV_PATH = Path("livemopay_energy.csv")
FIELDNAMES = [
    "capture_dt",
    "charge_label",
    "period_dt",
    "kwh",
    "tariff",
    "cost",
    "balance",
]
MONEY_RE = r'-?\d+(?:\.\d+)?'

ENERGY_ROW_RE = re.compile(
    r'^(?P<capture_dt>\d{2}/\d{2}/\d{4} \d{2}:\d{2})\n'
    r'(?P<charge_label>.+?) \((?P<period_dt>\d{4}-\d{2}-\d{2} \d{2}:\d{2})\)\n'
    rf'(?P<kwh>{MONEY_RE}) kWh @ R(?P<tariff>{MONEY_RE}) \(VAT Incl\)\n'
    rf'R(?P<cost>{MONEY_RE})\n'
    rf'R(?P<balance>{MONEY_RE})$'
)

FIXED_ROW_RE = re.compile(
    r'^(?P<capture_dt>\d{2}/\d{2}/\d{4} \d{2}:\d{2})\n'
    r'(?P<charge_label>Daily .+?) - (?P<period_date>\d{4}-\d{2}-\d{2})\n'
    rf'(?P<quantity>{MONEY_RE})\s+@ R(?P<tariff>{MONEY_RE}) \(VAT Incl\)\n'
    rf'R(?P<cost>{MONEY_RE})\n'
    rf'R(?P<balance>{MONEY_RE})$'
)

TOPUP_ROW_RE = re.compile(
    r'^(?P<capture_dt>\d{2}/\d{2}/\d{4} \d{2}:\d{2})\n'
    rf'Subtotal-R(?P<subtotal>{MONEY_RE})\n'
    rf'VAT-R(?P<vat>{MONEY_RE})\n'
    rf'Total-R(?P<total>{MONEY_RE})\n'
    rf'R(?P<amount>{MONEY_RE})\n'
    rf'R(?P<balance>{MONEY_RE})$'
)

seen_keys = set()
rows = []

def row_key(item):
    return (item["charge_label"], item["period_dt"], item["cost"], item["balance"])

def run(*args):
    return subprocess.run(
        [ADB, *args],
        check=True,
        capture_output=True,
        text=True,
    )

def capture_dt_to_period_dt(value):
    return datetime.strptime(value, "%d/%m/%Y %H:%M").strftime("%Y-%m-%d %H:%M")

def dump_ui(i: int) -> Path:
    remote = "/sdcard/view.xml"
    local = OUT_DIR / f"view_{i:04d}.xml"
    run("shell", "uiautomator", "dump", remote)
    run("pull", remote, str(local))
    return local

def parse_xml(path: Path) -> int:
    root = ET.parse(path).getroot()
    added = 0

    for node in root.iter("node"):
        desc = (node.attrib.get("content-desc") or "").strip()
        if "Energy Charge:" not in desc and "Daily " not in desc and "Subtotal-" not in desc:
            continue

        m = ENERGY_ROW_RE.match(desc)
        item = None

        if m:
            item = m.groupdict()
        else:
            m = FIXED_ROW_RE.match(desc)

            if m:
                item = m.groupdict()
                item["period_dt"] = f"{item.pop('period_date')} 00:00"
                item["kwh"] = "0"
                item.pop("quantity", None)
            else:
                m = TOPUP_ROW_RE.match(desc)

                if m:
                    item = m.groupdict()
                    item["charge_label"] = "Top Up"
                    item["period_dt"] = capture_dt_to_period_dt(item["capture_dt"])
                    item["kwh"] = "0"
                    item["tariff"] = "0"
                    item["cost"] = item.pop("amount")
                    item.pop("subtotal", None)
                    item.pop("vat", None)
                    item.pop("total", None)

        if not m:
            continue

        key = row_key(item)
        if key in seen_keys:
            continue

        seen_keys.add(key)
        rows.append(item)
        added += 1

    return added

def parse_existing_dumps():
    rows.clear()
    seen_keys.clear()

    for path in sorted(OUT_DIR.glob("view_*.xml")):
        parse_xml(path)

    save_csv()
    print(f"Done. Wrote {len(rows)} rows to livemopay_energy.csv", flush=True)

def swipe_up():
    run("shell", "input", "swipe", "540", "2100", "540", "900", "350")

def load_existing_csv():
    if not CSV_PATH.exists():
        return 0

    loaded = 0
    with CSV_PATH.open(newline="") as f:
        reader = csv.DictReader(f)
        for item in reader:
            if not all(item.get(field) for field in FIELDNAMES):
                continue

            key = row_key(item)
            if key in seen_keys:
                continue

            seen_keys.add(key)
            rows.append({field: item[field] for field in FIELDNAMES})
            loaded += 1

    return loaded

def save_csv():
    rows.sort(key=lambda x: x["period_dt"])
    with CSV_PATH.open("w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=FIELDNAMES,
        )
        writer.writeheader()
        writer.writerows(rows)

def main():
    if "--from-dumps" in sys.argv:
        parse_existing_dumps()
        return

    full_recapture = "--full" in sys.argv
    stagnant_rounds = 0
    max_stagnant_rounds = 4
    max_iterations = 500
    existing_count = 0 if full_recapture else load_existing_csv()
    new_count = 0

    if full_recapture:
        print(f"Starting full recapture. Existing {CSV_PATH} will be rebuilt.", flush=True)

    if existing_count:
        print(f"Loaded {existing_count} existing rows from {CSV_PATH}", flush=True)

    for i in range(1, max_iterations + 1):
        xml_path = dump_ui(i)
        added = parse_xml(xml_path)
        new_count += added
        total = len(rows)

        print(f"[{i}] added={added} new={new_count} total={total}", flush=True)

        if added == 0:
            stagnant_rounds += 1
        else:
            stagnant_rounds = 0

        save_csv()

        if stagnant_rounds >= max_stagnant_rounds:
            print("No new rows found for several rounds. Stopping.", flush=True)
            break

        swipe_up()
        time.sleep(1.2)

    if full_recapture:
        print(f"Done. Rebuilt {CSV_PATH} with {len(rows)} rows.", flush=True)
    else:
        print(f"Done. Added {new_count} new rows. Wrote {len(rows)} rows to {CSV_PATH}", flush=True)

if __name__ == "__main__":
    main()
