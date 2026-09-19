import { normalizeHandToken, labelToCell, handLabel } from "./hands.js";
import {
  actions,
  activeId,
  currentPosition,
  grid,
  saveState,
} from "./state.js";
import { renderGrid, renderLegend } from "./render.js";

// ── DOM references (resolved once at module load) ────────────────────────────

const importBackdrop = document.getElementById("importBackdrop");
const importTextarea = document.getElementById("importTextarea");
const importActionSelect = document.getElementById("importActionSelect");
const importSummary = document.getElementById("importSummary");
const importApplyBtn = document.getElementById("importApplyBtn");

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Parse a PioSolver-style range string into a map of hand → weight.
 * Returns the weights plus counts of recognised / unrecognised tokens.
 * @param {string} text
 * @returns {{ weights: Record<string, number>, recognized: number, unrecognized: number }}
 */
function parseRangeString(text) {
  const weights = {};
  let recognized = 0,
    unrecognized = 0;
  text.split(",").forEach((tok) => {
    const t = tok.trim();
    if (!t) return;
    const parts = t.split(":");
    const hand = normalizeHandToken(parts[0]);
    const w = parts.length > 1 ? parseFloat(parts[1]) : 1;
    if (hand && labelToCell[hand] !== undefined && !isNaN(w)) {
      weights[hand] = Math.max(0, Math.min(1, w));
      recognized++;
    } else {
      unrecognized++;
    }
  });
  return { weights, recognized, unrecognized };
}

/**
 * Apply parsed weights to the current grid, scaling existing frequencies
 * in each affected cell so the total does not exceed 1.
 * @param {string} targetId
 * @param {Record<string, number>} weights
 */
function applyImportedRange(targetId, weights) {
  Object.keys(labelToCell).forEach((hand) => {
    const { i, j } = labelToCell[hand];
    const cell = grid[i][j];
    const w = weights[hand] || 0;
    const others = Object.keys(cell.freqs).filter(
      (id) => id !== targetId,
    );
    const othersSum = others.reduce((s, id) => s + cell.freqs[id], 0);
    const allowedForOthers = Math.max(0, 1 - w);
    if (othersSum > allowedForOthers + 0.0001 && othersSum > 0) {
      const scale = allowedForOthers / othersSum;
      others.forEach((id) => {
        cell.freqs[id] = cell.freqs[id] * scale;
      });
    }
    if (w > 0) cell.freqs[targetId] = w;
    else delete cell.freqs[targetId];
  });
}

/**
 * Update the import summary line based on the current textarea content.
 */
function updateImportSummary() {
  const { recognized, unrecognized } = parseRangeString(
    importTextarea.value,
  );
  if (recognized === 0 && unrecognized === 0) {
    importSummary.textContent = "";
    return;
  }
  importSummary.textContent =
    unrecognized > 0
      ? `${recognized} manos reconocidas · ${unrecognized} tokens no reconocidos (se ignoran)`
      : `${recognized} manos reconocidas`;
  importSummary.classList.toggle("error", unrecognized > 0);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Open the PioSolver-style import modal.
 */
export function openImportModal() {
  importActionSelect.innerHTML = "";
  actions.forEach((a) => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.name;
    if (a.id === activeId) opt.selected = true;
    importActionSelect.appendChild(opt);
  });
  document.getElementById("importPositionLabel").textContent =
    currentPosition;
  importTextarea.value = "";
  importSummary.textContent = "";
  importSummary.classList.remove("error");
  importApplyBtn.disabled = actions.length === 0;
  importBackdrop.classList.add("open");
  importTextarea.focus();
}

/**
 * Initialise the import modal event listeners. Call once at app startup.
 * @param {(msg: string) => void} showToast - Toast notification callback
 */
export function initImport(showToast) {
  importTextarea.addEventListener("input", updateImportSummary);

  document.getElementById("importCancelBtn").addEventListener("click", () =>
    importBackdrop.classList.remove("open"),
  );

  importBackdrop.addEventListener("click", (e) => {
    if (e.target === importBackdrop)
      importBackdrop.classList.remove("open");
  });

  importApplyBtn.addEventListener("click", () => {
    const targetId = importActionSelect.value;
    if (!targetId) return;
    const { weights, recognized } = parseRangeString(
      importTextarea.value,
    );
    applyImportedRange(targetId, weights);
    importBackdrop.classList.remove("open");
    renderGrid();
    renderLegend();
    saveState();
    showToast(
      `${recognized} manos importadas a "${actions.find((a) => a.id === targetId)?.name || ""}" (${currentPosition}).`,
    );
  });
}
