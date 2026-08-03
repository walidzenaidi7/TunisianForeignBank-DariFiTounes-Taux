// ============================================================
//  Taux STB — logique de la page
//  - Tableau de change (toutes devises)  ← data/latest.json
//  - Taux de référence EUR/TND (moyenne 30j) ← data/rates.json
//  Rempli automatiquement à partir des données du robot.
// ============================================================

const WINDOW_SIZE = 30;

// Devises affichées dans le tableau, dans l'ordre.
// Le robot fournit les nombres ; ici on ne garde que l'habillage (drapeau + nom).
const CURRENCIES = [
  { code: "EUR", name: "Euro",              flag: "🇪🇺", aria: "Drapeau de l'Union européenne" },
  { code: "USD", name: "Dollar américain",  flag: "🇺🇸", aria: "Drapeau des États-Unis" },
  { code: "GBP", name: "Livre sterling",    flag: "🇬🇧", aria: "Drapeau du Royaume-Uni" },
  { code: "CHF", name: "Franc suisse",      flag: "🇨🇭", aria: "Drapeau de la Suisse" },
  { code: "CAD", name: "Dollar canadien",   flag: "🇨🇦", aria: "Drapeau du Canada" },
];

const rateValueEl = document.getElementById("rate-value");
const rateDateEl = document.getElementById("rate-date");
const averageExplainerEl = document.getElementById("average-explainer");
const historicBodyEl = document.getElementById("historic-body");
const statusEl = document.getElementById("status");
const fxBodyEl = document.getElementById("fx-body");
const fxUpdatedEl = document.getElementById("fx-updated");

// Formate un nombre à la française : 3 décimales, virgule décimale.
function fmt(n) {
  return Number(n).toFixed(3).replace(".", ",");
}

// ------------------------------------------------------------
//  Tableau de change (toutes devises)
// ------------------------------------------------------------
async function loadTable() {
  let data = null;
  try {
    const response = await fetch("data/latest.json", { cache: "no-store" });
    if (response.ok) data = await response.json();
  } catch (err) {
    // pas de fichier / pas encore de données : on affiche l'état "en attente"
  }

  const rates = data && data.rates ? data.rates : {};
  const hasData = Object.keys(rates).length > 0;

  if (!hasData) {
    fxUpdatedEl.textContent = "En attente de données";
    fxBodyEl.innerHTML =
      `<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:26px 20px;">
         Les taux s'afficheront après la première mise à jour automatique.
       </td></tr>`;
    return;
  }

  fxUpdatedEl.innerHTML = data.date
    ? `Cours STB<br>du ${data.date}`
    : "Cours STB";

  fxBodyEl.innerHTML = CURRENCIES.map((c) => {
    const r = rates[c.code];
    const achat = r && r.achat != null ? fmt(r.achat) : "—";
    const vente = r && r.vente != null ? fmt(r.vente) : "—";
    return `
      <tr>
        <td>
          <div class="currency">
            <span class="flag" aria-label="${c.aria}">${c.flag}</span>
            <span>
              <strong>${c.code}</strong>
              <span class="currency-name">${c.name}</span>
            </span>
          </div>
        </td>
        <td class="rate">${achat}</td>
        <td class="rate">${vente}</td>
      </tr>`;
  }).join("");
}

// ------------------------------------------------------------
//  Taux de référence EUR/TND (moyenne mobile 30 jours)
// ------------------------------------------------------------
async function loadAverage() {
  let archive = [];
  try {
    const response = await fetch("data/rates.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    archive = await response.json();
  } catch (err) {
    statusEl.textContent = `Impossible de charger rates.json : ${err.message}`;
    rateDateEl.textContent = "";
    return;
  }

  if (archive.length === 0) {
    rateValueEl.textContent = "—";
    rateDateEl.textContent = "Aucune donnée pour l'instant";
    averageExplainerEl.textContent =
      "Lancez le robot pour enregistrer le premier taux.";
    return;
  }

  const windowed = archive.slice(-WINDOW_SIZE);
  const average = windowed.reduce((sum, r) => sum + r.achat, 0) / windowed.length;
  const n = windowed.length;

  rateValueEl.textContent = fmt(average);
  rateDateEl.textContent = `du ${windowed[0].rate_date} au ${windowed[n - 1].rate_date}`;
  averageExplainerEl.textContent =
    `Moyenne des ${n} dernier${n > 1 ? "s" : ""} jour${n > 1 ? "s" : ""} ouvré${n > 1 ? "s" : ""}` +
    (archive.length > WINDOW_SIZE
      ? ` (fenêtre glissante sur ${WINDOW_SIZE} jours : les plus anciens sortent au fur et à mesure).`
      : ` (la fenêtre glissera une fois ${WINDOW_SIZE} jours enregistrés).`);

  renderHistoric(archive);
}

function renderHistoric(archive) {
  historicBodyEl.innerHTML = "";
  [...archive].reverse().forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.rate_date}</td><td>${fmt(r.achat)}</td>`;
    historicBodyEl.appendChild(tr);
  });
}

// ------------------------------------------------------------
//  Onglets
// ------------------------------------------------------------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

loadTable();
loadAverage();
