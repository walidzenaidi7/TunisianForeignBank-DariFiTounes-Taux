# STB EUR/TND Rate Tracker — Full Handoff Spec

This single document contains everything needed to rebuild this project from
scratch on another computer, understand why every decision was made, and take
it from "runs on my machine" to "runs automatically forever, on a public URL."
It is self-contained: every file's full source is included below, so no other
files need to be transferred for the rebuild itself.

---

## 1. What this is and why it exists

**Use case:** A small internal tool for a handful of people at one company who
need to track the EUR→TND exchange rate published daily by STB Bank (a
Tunisian bank), without anyone having to manually check the bank's website
every day.

**What it does:**
- Every weekday morning, it automatically fetches STB Bank's published
  EUR/TND exchange rate from their public website.
- It stores that rate permanently, building up a daily history.
- A simple web page shows:
  - A rolling 30-trading-day average of the rate (the headline number).
  - A "Historic" tab listing every date recorded and that day's rate.
  - A button to download the entire history as a CSV file.

**Who it's for:** Not a public product — a small, internal, low-traffic tool.
This shaped several decisions below (favor free/simple infrastructure over
anything that needs active maintenance or scales for large audiences).

**Current status:** Built and tested locally only. It has never been pushed
to GitHub or hosted publicly. The critical next step (and the reason this
document exists) is handing this off to someone else who will:
1. Reproduce it on their own computer, independent of the original author.
2. Push it to GitHub.
3. Turn on the scheduled automation and public hosting.

---

## 2. Design decisions and standards (read this before touching anything)

These were deliberately decided over the course of building this — do not
"improve" or change them without checking, since each one reflects a specific
choice:

1. **Data source:** `https://www.stb.com.tn/fr/bourse-et-change/cours-de-change/`
   — a WordPress page with a plain, server-rendered HTML `<table>`. No
   JavaScript rendering, no login, no CAPTCHA. Confirmed scrapable: this exact
   page path is **not** disallowed by the site's `robots.txt` (which blocks
   `/wp-admin/`, `/ar/`, `/en/`, and sitemap paths, but not this page).

2. **Which rate to store:** the **achat** rate (the bank's buying rate — the
   "Coût d'achat" column), NOT the "vente" (sell) rate. For EUR, the row looks
   like: unit = 1, vente = 3.427, achat = 3.347. Example sanity check used
   during development: 10 EUR × 3.347 = 33.47 TND, which matched what the
   bank's page showed. **Only EUR is tracked** — the page lists 13 currencies,
   but only the EUR row is scraped.

3. **How the page is parsed:** each currency row has a stable, unique marker —
   an `<img>` tag with `data-codedevise="EUR"` — inside `td.code-change`. The
   rate cells are `td.achat-change` (buy), `td.vente-change` (sell, unused),
   and `td.date-change` (the date the bank published, format `dd/mm/yy`).

4. **Storage format:** a single JSON array, one object per calendar day:
   ```json
   { "rate_date": "2026-07-31", "achat": 3.347, "scraped_at": "2026-07-31T08:00:00+00:00" }
   ```
   - `rate_date` is normalized to ISO `YYYY-MM-DD` from the bank's `dd/mm/yy`.
   - **The archive is never truncated or deleted from.** It grows forever.
     This was a deliberate choice: capping storage would break the "download
     full archive" feature. Only the *displayed average* is windowed (see
     next point) — the underlying data is always kept in full.
   - **Deduplication:** if the scraper runs and the most recent stored
     `rate_date` already matches the date on the page, it skips instead of
     writing a duplicate. This makes it safe to re-run the scraper multiple
     times in one day.

5. **The rolling average (the main number shown on the page):**
   - Computed as the average of the **last 30 stored entries** (not 30
     calendar days — 30 recorded weekday entries).
   - Before 30 entries exist, it averages however many exist so far (e.g.,
     after one week, it's the average of 5).
   - Once more than 30 entries exist, the oldest entries roll off the
     *average calculation only* — e.g., on recording the 31st entry, the
     1st entry stops being counted in the average, but stays in storage/download/history.
   - This is computed client-side in `app.js`, recalculated on every page
     load — nothing about this logic lives in the scraper.

6. **The "Historic" tab:** shows *every* stored entry (not windowed to 30),
   most recent first — date and achat rate. This is the same underlying data
   as the CSV download, just rendered as a table instead of a file.

7. **Schedule: 9:00 AM Tunis time, Monday–Friday only** (no weekend runs,
   since the bank doesn't publish new rates on weekends anyway).
   - Tunisia does **not** observe Daylight Saving Time — it stays UTC+1
     year-round. So in UTC (which is what GitHub Actions cron uses), 9:00 AM
     Tunis time is always **8:00 UTC**, with no seasonal adjustment ever
     needed.
   - Cron expression used: `0 8 * * 1-5` (minute 0, hour 8 UTC, Mon–Fri).

8. **Automation mechanism: GitHub Actions**, not a local scheduler (cron/
   launchd) and not a separate cloud server. Reasoning, explicitly confirmed
   during design:
   - It must run regardless of whether any particular person's computer is
     on, closed, or asleep — a local scheduler fails this requirement by
     definition.
   - For a small internal audience, GitHub Actions' free tier is more than
     sufficient (a few-second script, once a day, five days a week) — no
     cost, no server to patch or maintain.
   - Alternatives considered and rejected as unnecessary complexity for this
     scale: a VPS with cron, AWS Lambda + CloudWatch Events, or a third-party
     cron-ping service hitting a webhook. All of these require standing up
     and maintaining infrastructure that GitHub Actions already replaces for
     free.
   - The GitHub Action, on every scheduled run, executes the scraper and then
     commits the updated `rates.json` straight back into the repo. Static
     hosting (see next point) then just needs to redeploy on every push —
     no server-side logic anywhere.

9. **Hosting — deliberately left as an open decision, not yet made:**
   Whoever ends up owning this decides between:
   - **Public repo + GitHub Pages** — simplest possible pairing, zero extra
     accounts, completely free on any GitHub plan. Tradeoff: the source code
     and the full rate history become publicly browsable in the repo itself
     (in addition to being reachable via the site's download button).
   - **Private repo + Netlify (free tier)** — keeps source code and raw data
     file private; Netlify's free tier can deploy a private GitHub repo to a
     public site URL at no cost. The GitHub Action still does the exact same
     scraping/commit step either way — only the hosting side differs. Note:
     native GitHub Pages does **not** support private repos on GitHub's free
     plan (requires GitHub Pro/Team/Enterprise) — that's why Netlify is the
     free option for the private-repo path.

10. **Explicitly out of scope for this version** (do not add unless asked):
    - No error handling/alerting if the scrape fails or the bank changes
      their page's HTML structure — this is a test/early build, not
      production-hardened.
    - No multi-currency tracking — only EUR.
    - No user accounts, auth, or access control on the site — it's a plain
      public (or link-shared) static page.

---

## 3. Project structure

```
stb-rate-tracker/
├── scraper.py                     # fetches STB's page, extracts EUR achat rate, appends to archive
├── docs/
│   ├── index.html                 # the page: current average + Historic tab + download button
│   ├── app.js                     # all client-side logic (fetch archive, compute average, render tabs)
│   └── data/
│       └── rates.json             # the growing archive — ships as `[]` in a fresh rebuild
└── .github/
    └── workflows/
        └── scrape.yml             # GitHub Actions: runs scraper.py on schedule, commits the result
```

---

## 4. Full source — copy these files exactly

### `scraper.py`

```python
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
```

### `docs/index.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>EUR/TND Rate Tracker</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      max-width: 640px;
      margin: 4rem auto;
      padding: 0 1.5rem;
      color: #1a1a1a;
    }
    .rate-card {
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
    }
    .rate-value {
      font-size: 3rem;
      font-weight: 700;
      margin: 0.5rem 0;
    }
    .rate-date {
      color: #666;
      font-size: 0.9rem;
    }
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin: 2rem 0 1rem;
      border-bottom: 1px solid #ddd;
    }
    .tab-btn {
      padding: 0.6rem 1rem;
      border: none;
      background: none;
      font-size: 0.95rem;
      cursor: pointer;
      color: #666;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .tab-btn.active {
      color: #1a1a1a;
      font-weight: 600;
      border-bottom-color: #1a1a1a;
    }
    .tab-panel {
      display: none;
    }
    .tab-panel.active {
      display: block;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th, td {
      text-align: left;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #eee;
    }
    th {
      color: #666;
      font-weight: 600;
    }
    button {
      margin-top: 1.5rem;
      padding: 0.6rem 1.2rem;
      font-size: 0.95rem;
      border-radius: 8px;
      border: 1px solid #333;
      background: #1a1a1a;
      color: #fff;
      cursor: pointer;
    }
    button:hover {
      background: #333;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #status {
      color: #999;
      font-size: 0.85rem;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <h1>EUR / TND — Achat Rate</h1>

  <div class="rate-card">
    <div class="rate-date" id="rate-date">Loading…</div>
    <div class="rate-value" id="rate-value">—</div>
    <div class="rate-date">TND per 1 EUR (STB Bank, achat)</div>
    <button id="download-btn">Download full archive (CSV)</button>
    <div id="status"></div>
  </div>

  <div class="tabs">
    <button class="tab-btn active" data-tab="current">Current</button>
    <button class="tab-btn" data-tab="historic">Historic</button>
  </div>

  <div class="tab-panel active" id="tab-current">
    <p id="average-explainer" style="color:#666; font-size:0.9rem;"></p>
  </div>

  <div class="tab-panel" id="tab-historic">
    <table>
      <thead>
        <tr><th>Date</th><th>Achat rate</th></tr>
      </thead>
      <tbody id="historic-body"></tbody>
    </table>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

### `docs/app.js`

```javascript
const WINDOW_SIZE = 30;

const rateValueEl = document.getElementById("rate-value");
const rateDateEl = document.getElementById("rate-date");
const averageExplainerEl = document.getElementById("average-explainer");
const historicBodyEl = document.getElementById("historic-body");
const statusEl = document.getElementById("status");
const downloadBtn = document.getElementById("download-btn");

let archive = [];

async function loadArchive() {
  try {
    const response = await fetch("data/rates.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    archive = await response.json();

    if (archive.length === 0) {
      rateValueEl.textContent = "No data yet";
      rateDateEl.textContent = "Run scraper.py to record the first rate";
      downloadBtn.disabled = true;
      return;
    }

    renderAverage();
    renderHistoric();
  } catch (err) {
    statusEl.textContent = `Could not load rates.json: ${err.message}`;
    downloadBtn.disabled = true;
  }
}

function renderAverage() {
  const windowed = archive.slice(-WINDOW_SIZE);
  const average = windowed.reduce((sum, r) => sum + r.achat, 0) / windowed.length;

  rateValueEl.textContent = average.toFixed(3);
  rateDateEl.textContent = `${windowed[0].rate_date} → ${windowed[windowed.length - 1].rate_date}`;
  averageExplainerEl.textContent =
    `Average of the last ${windowed.length} trading day${windowed.length === 1 ? "" : "s"}` +
    (archive.length > WINDOW_SIZE
      ? ` (rolling window, capped at ${WINDOW_SIZE} — older days drop off as new ones come in).`
      : ` (will start rolling off the oldest day once ${WINDOW_SIZE} are recorded).`);
}

function renderHistoric() {
  historicBodyEl.innerHTML = "";
  [...archive].reverse().forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.rate_date}</td><td>${r.achat.toFixed(3)}</td>`;
    historicBodyEl.appendChild(tr);
  });
}

function toCsv(rows) {
  const header = "rate_date,achat,scraped_at";
  const lines = rows.map((r) => `${r.rate_date},${r.achat},${r.scraped_at}`);
  return [header, ...lines].join("\n");
}

downloadBtn.addEventListener("click", () => {
  const csv = toCsv(archive);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "eur_tnd_rates.csv";
  a.click();
  URL.revokeObjectURL(url);
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

loadArchive();
```

### `docs/data/rates.json` (fresh/production starting state)

```json
[]
```

> ⚠️ **Important:** in the original build environment, this file currently
> contains 1 real scraped value (2026-07-31, achat 3.347) plus 39 **synthetic,
> randomly generated** entries that were added purely to visually demo the
> rolling average and the Historic tab before real history existed. None of
> that synthetic data should be carried over. Start the rebuild with `[]`
> (empty array) so all history from here on is real.

### `.github/workflows/scrape.yml`

```yaml
name: Scrape EUR/TND rate

on:
  schedule:
    # 08:00 UTC = 09:00 Tunis time (Tunisia stays UTC+1 year-round, no DST)
    - cron: "0 8 * * 1-5"
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.x"

      - run: pip install requests beautifulsoup4

      - run: python3 scraper.py

      - name: Commit updated rate if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add docs/data/rates.json
          git diff --cached --quiet || git commit -m "Update EUR/TND rate"
          git push
```

---

## 5. Step-by-step: rebuild and test locally

1. Create the folder structure shown in section 3, and paste in each file
   from section 4 exactly as written (including `docs/data/rates.json` as
   `[]`).

2. Install dependencies (Python 3 required):
   ```
   pip install requests beautifulsoup4
   ```

3. Run the scraper once to confirm it can reach the bank's page and parse it:
   ```
   python3 scraper.py
   ```
   Expected output: `Recorded EUR achat rate <value> for <date>.`
   Running it again immediately should print `...already recorded..., skipping.`
   instead of duplicating — this confirms the dedup logic works.

4. Serve the site locally (plain `file://` won't work — browsers block
   `fetch()` of local files under `file://` via CORS — so use a local
   server):
   ```
   cd docs
   python3 -m http.server 8765
   ```
   Open `http://localhost:8765/` in a browser. Confirm:
   - The "Current" tab shows the rate you just scraped.
   - The "Historic" tab lists that same date/rate.
   - "Download full archive (CSV)" produces a CSV with that entry.

---

## 6. Step-by-step: make it public and fully automatic

1. **Decide repo visibility first** (public vs. private — see section 2,
   point 9, for the tradeoffs). This determines which hosting path below to
   follow.

2. Initialize git and push to GitHub:
   ```
   git init
   git add .
   git commit -m "Initial commit: STB EUR/TND rate tracker"
   git branch -M main
   git remote add origin <your-new-github-repo-url>
   git push -u origin main
   ```

3. **If the repo is public** — enable GitHub Pages:
   - Repo Settings → Pages → Source: deploy from a branch → branch `main`,
     folder `/docs`.
   - (This is why the site folder is named `docs` and not something like
     `site` — GitHub's branch-based Pages deployment only offers two folder
     choices: the repo root or a folder literally named `/docs`. Nothing else
     is selectable.)
   - The site will be live at `https://<github-username>.github.io/<repo-name>/`.

   **If the repo is private** — use Netlify (free tier):
   - Create a free Netlify account, "Add new site" → "Import an existing
     project" → connect the GitHub repo.
   - Set the publish directory to `docs`.
   - Netlify will give a public URL (e.g. `https://<something>.netlify.app`)
     and auto-redeploy on every push to `main`.

4. **Verify the GitHub Action works before waiting for the real schedule:**
   - In the repo's "Actions" tab, find the "Scrape EUR/TND rate" workflow.
   - Click "Run workflow" (this works because of the `workflow_dispatch`
     trigger already in `scrape.yml`) to trigger it manually.
   - Confirm the run succeeds, and check that `docs/data/rates.json` got a
     new commit (or correctly logged a skip if today's rate was already
     recorded).
   - Confirm the live site (Pages or Netlify URL) reflects the update within
     a minute or two.

5. **Let it run for real:** on the next scheduled weekday (9:00 AM Tunis /
   8:00 UTC), confirm a new entry appears automatically with no one doing
   anything manually. At that point the system is fully independent of any
   individual's computer.

---

## 7. Open items / next steps

- **Repo visibility decision** (public+Pages vs. private+Netlify) is not yet
  made — decide before step 6.1 above.
- No failure alerting exists yet. If the bank changes their page's HTML, the
  scrape will start failing silently (the Action run will show as failed in
  GitHub's UI, but no one gets notified). Acceptable for now since this is
  still an early/test build — worth revisiting once this moves beyond
  internal testing.
- Only EUR is tracked. Extending to other currencies would mean adjusting
  `fetch_eur_rate()` in `scraper.py` to loop over multiple currency codes
  instead of returning on the first EUR match, and adjusting the storage
  shape accordingly.
