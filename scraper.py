#!/usr/bin/env python3
"""Récupère les cours de change chez STB Bank.

- Ajoute le taux EUR (achat) à docs/data/rates.json  (série pour la moyenne 30j).
- Écrit un instantané de tout le tableau dans docs/data/latest.json.

Usage : python3 scraper.py
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
DATA_DIR = pathlib.Path(__file__).parent / "docs" / "data"
RATES_PATH = DATA_DIR / "rates.json"       # série EUR (moyenne 30j)
LATEST_PATH = DATA_DIR / "latest.json"     # instantané du tableau complet


def parse_number(text: str) -> float:
    """Tolère la virgule décimale et les espaces (ex. '3,347' ou '3 347,0')."""
    cleaned = (
        text.strip()
        .replace("\xa0", "")   # espace insécable
        .replace(" ", "")
        .replace(",", ".")
    )
    return float(cleaned)


def fetch_table():
    """Retourne (rates_dict, date_iso).

    rates_dict = { 'EUR': {'achat': 3.34, 'vente': 3.41}, 'USD': {...}, ... }
    """
    response = requests.get(URL, headers=HEADERS, timeout=15)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    rates = {}
    date_iso = None

    for row in soup.select("table tbody tr"):
        code_img = row.select_one("td.code-change img[data-codedevise]")
        if not code_img:
            continue
        code = code_img["data-codedevise"].strip().upper()

        achat_cell = row.select_one("td.achat-change")
        vente_cell = row.select_one("td.vente-change")
        date_cell = row.select_one("td.date-change")

        entry = {}
        if achat_cell:
            try:
                entry["achat"] = parse_number(achat_cell.get_text())
            except ValueError:
                entry["achat"] = None
        if vente_cell:
            try:
                entry["vente"] = parse_number(vente_cell.get_text())
            except ValueError:
                entry["vente"] = None

        if entry:
            rates[code] = entry

        if date_iso is None and date_cell:
            date_iso = to_iso_date(date_cell.get_text(strip=True))

    if not rates:
        raise ValueError(
            "Aucune devise trouvee sur la page — le HTML du site a peut-etre change"
        )
    return rates, date_iso


def to_iso_date(dd_mm_yy: str) -> str:
    day, month, year = dd_mm_yy.split("/")
    year = year if len(year) == 4 else f"20{year}"
    return f"{year}-{month}-{day}"


def load_json(path, default):
    if path.exists():
        return json.loads(path.read_text())
    return default


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main():
    rates, date_iso = fetch_table()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1) Instantané complet du tableau (écrase à chaque fois)
    save_json(LATEST_PATH, {"date": date_iso, "scraped_at": now_iso, "rates": rates})
    print(f"Tableau enregistre ({len(rates)} devises) pour le {date_iso}.")

    # 2) Série EUR pour la moyenne 30 jours (ajout sans doublon)
    eur = rates.get("EUR")
    if not eur or eur.get("achat") is None:
        print("EUR introuvable dans le tableau, serie non mise a jour.", file=sys.stderr)
        return

    archive = load_json(RATES_PATH, [])
    if archive and archive[-1]["rate_date"] == date_iso:
        print(f"Taux EUR du {date_iso} deja enregistre ({archive[-1]['achat']}), on saute.")
        return

    archive.append({
        "rate_date": date_iso,
        "achat": eur["achat"],
        "scraped_at": now_iso,
    })
    save_json(RATES_PATH, archive)
    print(f"Taux EUR achat {eur['achat']} enregistre pour le {date_iso}.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Echec du scraping : {exc}", file=sys.stderr)
        sys.exit(1)
