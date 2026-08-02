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
