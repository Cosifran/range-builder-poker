import { handLabel } from "./hands.js";
import { actions, grid, saveState } from "./state.js";
import { cellBackground, renderGrid, renderLegend } from "./render.js";

/** Currently edited cell coordinates, or null when the editor is closed. */
let editingCell = null;

/** DOM references (resolved once at module load). */
const backdrop = document.getElementById("editorBackdrop");
const rowsEl = document.getElementById("editorRows");
const sumEl = document.getElementById("editorSum");
const applyBtn = document.getElementById("editorApplyBtn");

/**
 * Return all number inputs inside the editor rows.
 * @returns {HTMLInputElement[]}
 */
function currentInputs() {
  return Array.from(rowsEl.querySelectorAll('input[type="number"]'));
}

/**
 * Recalculate and display the sum of all percentage inputs.
 * Disables the apply button when the sum exceeds 100%.
 */
function updateSum() {
  const inputs = currentInputs();
  let sum = 0;
  inputs.forEach((inp) => {
    sum += Number(inp.value) || 0;
  });
  const remaining = 100 - sum;
  if (sum > 100) {
    sumEl.textContent = `Suma: ${sum}% — no puede superar 100%`;
    sumEl.classList.add("error");
    applyBtn.disabled = true;
  } else {
    sumEl.textContent = `Suma: ${sum}% · Sin asignar (fold/vacío): ${remaining}%`;
    sumEl.classList.remove("error");
    applyBtn.disabled = false;
  }
}

/**
 * Open the percentage editor modal for a specific cell.
 * @param {number} i - Row index
 * @param {number} j - Column index
 */
export function openEditor(i, j) {
  editingCell = { i, j };
  const cell = grid[i][j];
  document.getElementById("editorHandLabel").textContent = handLabel(i, j);
  document.getElementById("editorPreview").style.background =
    cellBackground(cell);
  rowsEl.innerHTML = "";
  actions.forEach((a) => {
    const row = document.createElement("div");
    row.className = "editor-row";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = a.color;
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = a.name;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "100";
    input.step = "5";
    input.value = Math.round((cell.freqs[a.id] || 0) * 100);
    input.dataset.actionId = a.id;
    input.addEventListener("input", updateSum);
    row.appendChild(sw);
    row.appendChild(label);
    row.appendChild(input);
    const pct = document.createElement("span");
    pct.className = "action-meta";
    pct.textContent = "%";
    row.appendChild(pct);
    rowsEl.appendChild(row);
  });
  updateSum();
  backdrop.classList.add("open");
}

/**
 * Initialise the percentage editor modal event listeners.
 * Call once at app startup.
 */
export function initEditor() {
  applyBtn.addEventListener("click", () => {
    if (!editingCell) return;
    const freqs = {};
    currentInputs().forEach((inp) => {
      const v = Number(inp.value) || 0;
      if (v > 0) freqs[inp.dataset.actionId] = v / 100;
    });
    grid[editingCell.i][editingCell.j] = { freqs };
    backdrop.classList.remove("open");
    editingCell = null;
    renderGrid();
    renderLegend();
    saveState();
  });

  document.getElementById("editorCancelBtn").addEventListener("click", () => {
    backdrop.classList.remove("open");
    editingCell = null;
  });

  document.getElementById("editorClearBtn").addEventListener("click", () => {
    if (!editingCell) return;
    grid[editingCell.i][editingCell.j] = { freqs: {} };
    backdrop.classList.remove("open");
    editingCell = null;
    renderGrid();
    renderLegend();
    saveState();
  });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      backdrop.classList.remove("open");
      editingCell = null;
    }
  });
}
