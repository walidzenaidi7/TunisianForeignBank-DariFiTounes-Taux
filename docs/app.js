// ============================================================
//  Taux STB — logique de la page
//  - Tableau de change (toutes devises)  ← data/latest.json
//  - Taux de référence EUR/TND (moyenne 30j) ← data/rates.json
//  Rempli automatiquement à partir des données du robot.
// ============================================================

const WINDOW_SIZE = 30;

// Devises affichées dans le tableau, dans l'ordre.
// Le robot fournit les nombres ; ici on ne garde que l'habillage (drapeau + nom).
const FLAGS = {
  eu: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiBpZD0iZmxhZy1pY29ucy1ldSIgdmlld0JveD0iMCAwIDY0MCA0ODAiPgogIDxkZWZzPgogICAgPGcgaWQ9ImV1LWQiPgogICAgICA8ZyBpZD0iZXUtYiI+CiAgICAgICAgPHBhdGggaWQ9ImV1LWEiIGQ9Im0wLTEtLjMgMSAuNS4xeiIvPgogICAgICAgIDx1c2UgeGxpbms6aHJlZj0iI2V1LWEiIHRyYW5zZm9ybT0ic2NhbGUoLTEgMSkiLz4KICAgICAgPC9nPgogICAgICA8ZyBpZD0iZXUtYyI+CiAgICAgICAgPHVzZSB4bGluazpocmVmPSIjZXUtYiIgdHJhbnNmb3JtPSJyb3RhdGUoNzIpIi8+CiAgICAgICAgPHVzZSB4bGluazpocmVmPSIjZXUtYiIgdHJhbnNmb3JtPSJyb3RhdGUoMTQ0KSIvPgogICAgICA8L2c+CiAgICAgIDx1c2UgeGxpbms6aHJlZj0iI2V1LWMiIHRyYW5zZm9ybT0ic2NhbGUoLTEgMSkiLz4KICAgIDwvZz4KICA8L2RlZnM+CiAgPHBhdGggZmlsbD0iIzAzOSIgZD0iTTAgMGg2NDB2NDgwSDB6Ii8+CiAgPGcgZmlsbD0iI2ZjMCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzIwIDI0Mi4zKXNjYWxlKDIzLjcwMzcpIj4KICAgIDx1c2UgeGxpbms6aHJlZj0iI2V1LWQiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHk9Ii02Ii8+CiAgICA8dXNlIHhsaW5rOmhyZWY9IiNldS1kIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB5PSI2Ii8+CiAgICA8ZyBpZD0iZXUtZSI+CiAgICAgIDx1c2UgeGxpbms6aHJlZj0iI2V1LWQiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHg9Ii02Ii8+CiAgICAgIDx1c2UgeGxpbms6aHJlZj0iI2V1LWQiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHRyYW5zZm9ybT0icm90YXRlKC0xNDQgLTIuMyAtMi4xKSIvPgogICAgICA8dXNlIHhsaW5rOmhyZWY9IiNldS1kIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB0cmFuc2Zvcm09InJvdGF0ZSgxNDQgLTIuMSAtMi4zKSIvPgogICAgICA8dXNlIHhsaW5rOmhyZWY9IiNldS1kIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB0cmFuc2Zvcm09InJvdGF0ZSg3MiAtNC43IC0yKSIvPgogICAgICA8dXNlIHhsaW5rOmhyZWY9IiNldS1kIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB0cmFuc2Zvcm09InJvdGF0ZSg3MiAtNSAuNSkiLz4KICAgIDwvZz4KICAgIDx1c2UgeGxpbms6aHJlZj0iI2V1LWUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHRyYW5zZm9ybT0ic2NhbGUoLTEgMSkiLz4KICA8L2c+Cjwvc3ZnPgo=",
  us: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJmbGFnLWljb25zLXVzIiB2aWV3Qm94PSIwIDAgNjQwIDQ4MCI+CiAgPHBhdGggZmlsbD0iI2JkM2Q0NCIgZD0iTTAgMGg2NDB2NDgwSDAiLz4KICA8cGF0aCBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMzciIGQ9Ik0wIDU1LjNoNjQwTTAgMTI5aDY0ME0wIDIwM2g2NDBNMCAyNzdoNjQwTTAgMzUxaDY0ME0wIDQyNWg2NDAiLz4KICA8cGF0aCBmaWxsPSIjMTkyZjVkIiBkPSJNMCAwaDM2NC44djI1OC41SDAiLz4KICA8bWFya2VyIGlkPSJ1cy1hIiBtYXJrZXJIZWlnaHQ9IjMwIiBtYXJrZXJXaWR0aD0iMzAiPgogICAgPHBhdGggZmlsbD0iI2ZmZiIgZD0ibTE0IDAgOSAyN0wwIDEwaDI4TDUgMjd6Ii8+CiAgPC9tYXJrZXI+CiAgPHBhdGggZmlsbD0ibm9uZSIgbWFya2VyLW1pZD0idXJsKCN1cy1hKSIgZD0ibTAgMCAxNiAxMWg2MSA2MSA2MSA2MSA2MEw0NyAzN2g2MSA2MSA2MCA2MUwxNiA2M2g2MSA2MSA2MSA2MSA2MEw0NyA4OWg2MSA2MSA2MCA2MUwxNiAxMTVoNjEgNjEgNjEgNjEgNjBMNDcgMTQxaDYxIDYxIDYwIDYxTDE2IDE2Nmg2MSA2MSA2MSA2MSA2MEw0NyAxOTJoNjEgNjEgNjAgNjFMMTYgMjE4aDYxIDYxIDYxIDYxIDYweiIvPgo8L3N2Zz4K",
  gb: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJmbGFnLWljb25zLWdiIiB2aWV3Qm94PSIwIDAgNjQwIDQ4MCI+CiAgPHBhdGggZmlsbD0iIzAxMjE2OSIgZD0iTTAgMGg2NDB2NDgwSDB6Ii8+CiAgPHBhdGggZmlsbD0iI0ZGRiIgZD0ibTc1IDAgMjQ0IDE4MUw1NjIgMGg3OHY2Mkw0MDAgMjQxbDI0MCAxNzh2NjFoLTgwTDMyMCAzMDEgODEgNDgwSDB2LTYwbDIzOS0xNzhMMCA2NFYweiIvPgogIDxwYXRoIGZpbGw9IiNDODEwMkUiIGQ9Im00MjQgMjgxIDIxNiAxNTl2NDBMMzY5IDI4MXptLTE4NCAyMCA2IDM1TDU0IDQ4MEgwek02NDAgMHYzTDM5MSAxOTFsMi00NEw1OTAgMHpNMCAwbDIzOSAxNzZoLTYwTDAgNDJ6Ii8+CiAgPHBhdGggZmlsbD0iI0ZGRiIgZD0iTTI0MSAwdjQ4MGgxNjBWMHpNMCAxNjB2MTYwaDY0MFYxNjB6Ii8+CiAgPHBhdGggZmlsbD0iI0M4MTAyRSIgZD0iTTAgMTkzdjk2aDY0MHYtOTZ6TTI3MyAwdjQ4MGg5NlYweiIvPgo8L3N2Zz4K",
  ch: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJmbGFnLWljb25zLWNoIiB2aWV3Qm94PSIwIDAgNjQwIDQ4MCI+CiAgPGcgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2Utd2lkdGg9IjFwdCI+CiAgICA8cGF0aCBmaWxsPSJyZWQiIGQ9Ik0wIDBoNjQwdjQ4MEgweiIvPgogICAgPGcgZmlsbD0iI2ZmZiI+CiAgICAgIDxwYXRoIGQ9Ik0xNzAgMTk1aDMwMHY5MEgxNzB6Ii8+CiAgICAgIDxwYXRoIGQ9Ik0yNzUgOTBoOTB2MzAwaC05MHoiLz4KICAgIDwvZz4KICA8L2c+Cjwvc3ZnPgo=",
  ca: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJmbGFnLWljb25zLWNhIiB2aWV3Qm94PSIwIDAgNjQwIDQ4MCI+CiAgPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTE1MC4xIDBoMzM5Ljd2NDgwSDE1MHoiLz4KICA8cGF0aCBmaWxsPSIjZDUyYjFlIiBkPSJNLTE5LjcgMGgxNjkuOHY0ODBILTE5Ljd6bTUwOS41IDBoMTY5Ljh2NDgwSDQ4OS45ek0yMDEgMjMybC0xMy4zIDQuNCA2MS40IDU0YzQuNyAxMy43LTEuNiAxNy44LTUuNiAyNWw2Ni42LTguNC0xLjYgNjcgMTMuOS0uMy0zLjEtNjYuNiA2Ni43IDhjLTQuMS04LjctNy44LTEzLjMtNC0yNy4ybDYxLjMtNTEtMTAuNy00Yy04LjgtNi44IDMuOC0zMi42IDUuNi00OC45IDAgMC0zNS43IDEyLjMtMzggNS44bC05LjItMTcuNS0zMi42IDM1LjhjLTMuNS45LTUtLjUtNS45LTMuNWwxNS03NC44LTIzLjggMTMuNHEtMy4yIDEuMy01LjItMi4ybC0yMy00Ni0yMy42IDQ3LjhxLTIuOCAyLjUtNSAuN0wyNjQgMTMwLjhsMTMuNyA3NC4xYy0xLjEgMy0zLjcgMy44LTYuNyAyLjJsLTMxLjItMzUuM2MtNCA2LjUtNi44IDE3LjEtMTIuMiAxOS41cy0yMy41LTQuNS0zNS42LTdjNC4yIDE0LjggMTcgMzkuNiA5IDQ3LjciLz4KPC9zdmc+Cg==",
  tn: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGlkPSJmbGFnLWljb25zLXRuIiB2aWV3Qm94PSIwIDAgNjQwIDQ4MCI+CiAgPHBhdGggZmlsbD0iI2U3MDAxMyIgZD0iTTAgMGg2NDB2NDgwSDB6Ii8+CiAgPHBhdGggZmlsbD0iI2ZmZiIgZD0iTTMyMCAxMTkuMmExIDEgMCAwIDAtMSAyNDAuMyAxIDEgMCAwIDAgMS0yNDAuM00zOTIgMjkzYTkwIDkwIDAgMSAxIDAtMTA3IDcyIDcyIDAgMSAwIDAgMTA3bS00LjctMjEuNy0zNy40LTEyLjEtMjMuMSAzMS44di0zOS4zbC0zNy40LTEyLjIgMzcuNC0xMi4yVjE4OGwyMy4xIDMxLjggMzcuNC0xMi4xLTIzLjEgMzEuOHoiLz4KPC9zdmc+Cg==",
};

const CURRENCIES = [
  { code: "EUR", name: "Euro",              flag: FLAGS.eu, aria: "Drapeau de l'Union européenne" },
  { code: "USD", name: "Dollar américain",  flag: FLAGS.us, aria: "Drapeau des États-Unis" },
  { code: "GBP", name: "Livre sterling",    flag: FLAGS.gb, aria: "Drapeau du Royaume-Uni" },
  { code: "CHF", name: "Franc suisse",      flag: FLAGS.ch, aria: "Drapeau de la Suisse" },
  { code: "CAD", name: "Dollar canadien",   flag: FLAGS.ca, aria: "Drapeau du Canada" },
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
            <span class="flag" aria-label="${c.aria}"><img class="flag-img" src="${c.flag}" alt=""></span>
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
