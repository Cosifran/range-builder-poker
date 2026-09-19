import "./style.css";

import {
  actions,
  activeId,
  mode,
  currentPosition,
  grid,
  isPointerDown,
  loadState,
  saveState,
  setMode,
  setCurrentPosition,
  setActiveId,
  setPointerDown,
  removeAction,
  clearCurrentGrid,
} from "./state.js";
import {
  renderPositions,
  renderGrid,
  renderLegend,
  updateModeHint,
} from "./render.js";
import { initEditor, openEditor } from "./editor.js";
import { initImport, openImportModal } from "./import-range.js";
import { initExport } from "./export-canvas.js";

// ── Toast helper ─────────────────────────────────────────────────────────────

/**
 * Show a brief toast notification at the bottom of the screen.
 * @param {string} msg
 */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

// ── Quick-paint helper ───────────────────────────────────────────────────────

/**
 * Paint a single cell with the current active action (or clear it for eraser).
 * @param {number} i
 * @param {number} j
 */
function applyQuickPaint(i, j) {
  grid[i][j] =
    activeId === null ? { freqs: {} } : { freqs: { [activeId]: 1 } };
  renderGrid(handleCellPointerDown, handleCellPointerEnter);
  renderLegend(
    handleActionSelect,
    handleActionDelete,
    handleActionColorChange,
    handleActionNameChange,
  );
  saveState();
}

// ── Grid pointer callbacks ───────────────────────────────────────────────────

function handleCellPointerDown(i, j, _event) {
  if (mode === "percent") {
    openEditor(i, j);
  } else {
    setPointerDown(true);
    applyQuickPaint(i, j);
  }
}

function handleCellPointerEnter(i, j, event) {
  if (mode === "quick" && isPointerDown && event.buttons & 1)
    applyQuickPaint(i, j);
}

// ── Legend callbacks ──────────────────────────────────────────────────────────

function handleActionSelect(actionId) {
  setActiveId(actionId);
  setMode("quick");
  updateModeHint();
  renderLegend(
    handleActionSelect,
    handleActionDelete,
    handleActionColorChange,
    handleActionNameChange,
  );
}

function handleActionDelete(actionId) {
  const wasActive = activeId === actionId;
  removeAction(actionId);
  if (wasActive) setActiveId(actions.length ? actions[0].id : null);
  renderGrid(handleCellPointerDown, handleCellPointerEnter);
  renderLegend(
    handleActionSelect,
    handleActionDelete,
    handleActionColorChange,
    handleActionNameChange,
  );
  saveState();
}

function handleActionColorChange(actionId, newColor) {
  const action = actions.find((a) => a.id === actionId);
  if (action) action.color = newColor;
  renderGrid(handleCellPointerDown, handleCellPointerEnter);
  saveState();
}

function handleActionNameChange(actionId, newName) {
  const action = actions.find((a) => a.id === actionId);
  if (action) action.name = newName || action.name;
  renderLegend(
    handleActionSelect,
    handleActionDelete,
    handleActionColorChange,
    handleActionNameChange,
  );
  saveState();
}

function handlePositionChange(pos) {
  setCurrentPosition(pos);
  renderPositions(handlePositionChange);
  renderGrid(handleCellPointerDown, handleCellPointerEnter);
  renderLegend(
    handleActionSelect,
    handleActionDelete,
    handleActionColorChange,
    handleActionNameChange,
  );
  saveState();
}

// ── Initialise ───────────────────────────────────────────────────────────────

loadState();
initEditor();
initImport(showToast);
initExport(showToast);

renderPositions(handlePositionChange);
renderGrid(handleCellPointerDown, handleCellPointerEnter);
renderLegend(
  handleActionSelect,
  handleActionDelete,
  handleActionColorChange,
  handleActionNameChange,
);
updateModeHint();

// ── Toolbar buttons ──────────────────────────────────────────────────────────

document
  .getElementById("quickModeBtn")
  .addEventListener("click", () => {
    setMode("quick");
    updateModeHint();
    renderLegend(
      handleActionSelect,
      handleActionDelete,
      handleActionColorChange,
      handleActionNameChange,
    );
  });

document
  .getElementById("percentModeBtn")
  .addEventListener("click", () => {
    setMode("percent");
    updateModeHint();
    renderLegend(
      handleActionSelect,
      handleActionDelete,
      handleActionColorChange,
      handleActionNameChange,
    );
  });

document.getElementById("eraserBtn").addEventListener("click", () => {
  setActiveId(null);
  setMode("quick");
  updateModeHint();
  renderLegend(
    handleActionSelect,
    handleActionDelete,
    handleActionColorChange,
    handleActionNameChange,
  );
});

document.getElementById("addAction").addEventListener("click", () => {
  const id = "a" + Date.now();
  actions.push({ id, name: "Nueva acción", color: "#a855f7" });
  setActiveId(id);
  renderLegend(
    handleActionSelect,
    handleActionDelete,
    handleActionColorChange,
    handleActionNameChange,
  );
  saveState();
});

document.getElementById("clearAll").addEventListener("click", () => {
  clearCurrentGrid();
  renderGrid(handleCellPointerDown, handleCellPointerEnter);
  renderLegend(
    handleActionSelect,
    handleActionDelete,
    handleActionColorChange,
    handleActionNameChange,
  );
  saveState();
});

document
  .getElementById("importBtn")
  .addEventListener("click", openImportModal);

// ── Global pointerup (stops drag-painting) ───────────────────────────────────

window.addEventListener("pointerup", () => {
  setPointerDown(false);
});
