#!/usr/bin/env python3
"""Scrapes the EUR/TND achat rate from STB Bank and appends it to docs/data/rates.json.

Usage: python3 scraper.py
"""
import datetime
import json
import pathlib
import sys

import requests
from bs4 import BeautifulSoup

URL = "https://www.stb.com.tn/fr/bourse-et-change/cours-de-change/"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}
DATA_PATH = pathlib.Path(__file__).parent / "docs" / "data" / "rates.json"


def fetch_eur_rate():
    response = requests.get(URL, headers=HEADERS, timeout=15)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    for row in soup.select("table tbody tr"):
        code_img = row.select_one("td.code-change img[data-codedevise]")
        if code_img and code_img["data-codedevise"] == "EUR":
            achat = row.select_one("td.achat-change").get_text(strip=True)
            date_text = row.select_one("td.date-change").get_text(strip=True)
            return achat, date_text

    raise ValueError("EUR row not found on the page — site markup may have changed")


def to_iso_date(dd_mm_yy: str) -> str:
    day, month, year = dd_mm_yy.split("/")
    return f"20{year}-{month}-{day}"


def load_archive() -> list:
    if DATA_PATH.exists():
        return json.loads(DATA_PATH.read_text())
    return []


def save_archive(archive: list) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(archive, indent=2) + "\n")


def main():
    achat_text, date_text = fetch_eur_rate()
    rate_date = to_iso_date(date_text)
    archive = load_archive()

    if archive and archive[-1]["rate_date"] == rate_date:
        print(f"Rate for {rate_date} already recorded ({archive[-1]['achat']}), skipping.")
        return

    entry = {
        "rate_date": rate_date,
        "achat": float(achat_text),
        "scraped_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    archive.append(entry)
    save_archive(archive)
    print(f"Recorded EUR achat rate {entry['achat']} for {rate_date}.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Scrape failed: {exc}", file=sys.stderr)
        sys.exit(1)
