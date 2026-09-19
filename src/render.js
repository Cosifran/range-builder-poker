import { POSITIONS, handLabel, comboCount } from "./hands.js";
import {
  actions,
  activeId,
  mode,
  currentPosition,
  currentExtraAction,
  currentGameMode,
  grid,
  TOTAL_COMBOS,
  EXTRA_ACTIONS,
  GAME_MODES,
} from "./state.js";

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Look up the color for an action ID.
 * @param {string} id
 * @returns {string|null}
 */
export function colorOf(id) {
  const a = actions.find((x) => x.id === id);
  return a ? a.color : null;
}

/**
 * Compute the CSS background for a cell (conic-gradient pie chart).
 * @param {{ freqs: Record<string, number> }} cell
 * @returns {string}
 */
export function cellBackground(cell) {
  const entries = Object.entries(cell.freqs).filter(
    ([id, f]) => f > 0.0001 && colorOf(id),
  );
  if (entries.length === 0) return "var(--cell-empty)";
  let acc = 0;
  const stops = [];
  entries.forEach(([id, f]) => {
    const start = acc * 360;
    acc += f;
    stops.push(
      `${colorOf(id)} ${start}deg ${Math.min(acc, 1) * 360}deg`,
    );
  });
  if (acc < 0.999)
    stops.push(`var(--cell-empty) ${acc * 360}deg 360deg`);
  if (entries.length === 1 && acc >= 0.999)
    return colorOf(entries[0][0]);
  return `conic-gradient(${stops.join(", ")})`;
}

/**
 * Compute combo totals per action across the entire grid.
 * @returns {Record<string, number>}
 */
export function comboSums() {
  const sums = {};
  actions.forEach((a) => (sums[a.id] = 0));
  sums["_empty"] = 0;
  for (let i = 0; i < 13; i++)
    for (let j = 0; j < 13; j++) {
      const total = comboCount(i, j);
      const cell = grid[i][j];
      let assigned = 0;
      Object.entries(cell.freqs).forEach(([id, f]) => {
        if (sums.hasOwnProperty(id)) {
          sums[id] += total * f;
          assigned += f;
        }
      });
      if (assigned < 0.999) sums["_empty"] += total * (1 - assigned);
    }
  return sums;
}

// ── DOM rendering ────────────────────────────────────────────────────────────

// Callback stores so modules that call renderGrid/renderLegend without arguments
// (editor.js, import-range.js) reuse the callbacks registered by main.js.
let _onCellPointerDown = () => {};
let _onCellPointerEnter = () => {};
let _onActionSelect = () => {};
let _onActionDelete = () => {};
let _onActionColorChange = () => {};
let _onActionNameChange = () => {};
let _onExtraActionSelect = () => {};
let _onGameModeChange = () => {};

/**
 * Render the game mode selector bar. Calls onGameModeChange(modeId) on button click.
 * @param {(modeId: string) => void} onGameModeChange
 */
export function renderGameModes(onGameModeChange) {
  if (onGameModeChange !== undefined) _onGameModeChange = onGameModeChange;
  const groupEl = document.getElementById("gameModeGroup");
  if (!groupEl) return;
  groupEl.innerHTML = "";
  GAME_MODES.forEach((m) => {
    const btn = document.createElement("button");
    btn.className =
      "game-mode-btn" + (m.id === currentGameMode ? " active" : "");
    btn.textContent = m.name;
    btn.style.setProperty("--mode-color", m.color);
    btn.addEventListener("click", () => _onGameModeChange(m.id));
    groupEl.appendChild(btn);
  });
  updateCaptureTitle();
}

/**
 * Render the position bar. Calls onPositionChange(pos) on button click.
 * @param {(pos: string) => void} onPositionChange
 */
export function renderPositions(onPositionChange) {
  const groupEl = document.getElementById("positionGroup");
  groupEl.innerHTML = "";
  POSITIONS.forEach((p) => {
    const btn = document.createElement("button");
    btn.className =
      "position-btn" + (p === currentPosition ? " active" : "");
    btn.textContent = p;
    btn.addEventListener("click", () => onPositionChange(p));
    groupEl.appendChild(btn);
  });
  updateCaptureTitle();
}

/**
 * Render the extra actions bar. Calls onExtraActionSelect(eaId) on button click.
 * @param {(eaId: string|null) => void} onExtraActionSelect
 */
export function renderExtraActions(onExtraActionSelect) {
  if (onExtraActionSelect !== undefined) _onExtraActionSelect = onExtraActionSelect;
  const groupEl = document.getElementById("extraActionGroup");
  if (!groupEl) return;
  groupEl.innerHTML = "";

  // Default RFI button
  const rfiBtn = document.createElement("button");
  rfiBtn.className = "extra-action-btn" + (currentExtraAction === null ? " active" : "");
  rfiBtn.textContent = "RFI (Default)";
  rfiBtn.addEventListener("click", () => _onExtraActionSelect(null));
  groupEl.appendChild(rfiBtn);

  // Extra action buttons
  EXTRA_ACTIONS.forEach((ea) => {
    const btn = document.createElement("button");
    btn.className = "extra-action-btn" + (currentExtraAction === ea.id ? " active" : "");
    btn.textContent = ea.name;
    btn.style.borderColor = ea.color;
    btn.addEventListener("click", () => _onExtraActionSelect(ea.id));
    groupEl.appendChild(btn);
  });

  updateCaptureTitle();
}

/**
 * Update the capture title to reflect current game mode, position, and extra action context.
 */
function updateCaptureTitle() {
  const titleEl = document.getElementById("captureTitle");
  if (!titleEl) return;
  
  // Get game mode name
  const modeObj = GAME_MODES.find(m => m.id === currentGameMode);
  const modeName = modeObj ? modeObj.name : currentGameMode;
  
  let title = `${modeName} — ${currentPosition}`;
  if (currentExtraAction) {
    const ea = EXTRA_ACTIONS.find((e) => e.id === currentExtraAction);
    if (ea) title += ` vs ${ea.name}`;
  } else {
    title += " — RFI (Default)";
  }
  titleEl.textContent = title;
}

/**
 * Render the 13×13 hand grid. Wires pointer callbacks for paint / editor.
 * Callbacks are optional after the first call — stored from the initial registration.
 * @param {(i: number, j: number, e: PointerEvent) => void} [onCellPointerDown]
 * @param {(i: number, j: number, e: PointerEvent) => void} [onCellPointerEnter]
 */
export function renderGrid(onCellPointerDown, onCellPointerEnter) {
  if (onCellPointerDown !== undefined) _onCellPointerDown = onCellPointerDown;
  if (onCellPointerEnter !== undefined) _onCellPointerEnter = onCellPointerEnter;
  const gridEl = document.getElementById("grid");
  gridEl.innerHTML = "";
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      const cellState = grid[i][j];
      const div = document.createElement("div");
      div.className = "cell";
      div.textContent = handLabel(i, j);
      div.style.background = cellBackground(cellState);
      div.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        _onCellPointerDown(i, j, e);
      });
      div.addEventListener("pointerenter", (e) => {
        _onCellPointerEnter(i, j, e);
      });
      gridEl.appendChild(div);
    }
  }
}

/**
 * Render the action legend (chips with color picker, name editor, delete).
 * Also updates toolbar button active states and the totals text.
 * Callbacks are optional after the first call — stored from the initial registration.
 *
 * @param {(actionId: string) => void} [onActionSelect]
 * @param {(actionId: string) => void} [onActionDelete]
 * @param {(actionId: string, newColor: string) => void} [onActionColorChange]
 * @param {(actionId: string, newName: string) => void} [onActionNameChange]
 */
export function renderLegend(
  onActionSelect,
  onActionDelete,
  onActionColorChange,
  onActionNameChange,
) {
  if (onActionSelect !== undefined) _onActionSelect = onActionSelect;
  if (onActionDelete !== undefined) _onActionDelete = onActionDelete;
  if (onActionColorChange !== undefined) _onActionColorChange = onActionColorChange;
  if (onActionNameChange !== undefined) _onActionNameChange = onActionNameChange;
  const sums = comboSums();
  const legendEl = document.getElementById("legend");
  legendEl.innerHTML = "";
  actions.forEach((a) => {
    const chip = document.createElement("div");
    chip.className = "action-chip";
    chip.style.outline =
      activeId === a.id && mode === "quick"
        ? "2px solid var(--active-ring)"
        : "none";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = a.color;
    colorInput.title = "Cambiar color";
    colorInput.addEventListener("input", () => {
      _onActionColorChange(a.id, colorInput.value);
    });

    const nameSpan = document.createElement("span");
    nameSpan.className = "action-name";
    nameSpan.contentEditable = "true";
    nameSpan.textContent = a.name;
    nameSpan.addEventListener("blur", () => {
      _onActionNameChange(a.id, nameSpan.textContent.trim());
    });

    const meta = document.createElement("span");
    const combos = sums[a.id] || 0;
    const pct = ((combos / TOTAL_COMBOS) * 100).toFixed(1);
    meta.className = "action-meta";
    meta.textContent = `${combos.toFixed(1)} combos · ${pct}%`;

    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.textContent = "×";
    delBtn.title = "Eliminar acción";
    delBtn.addEventListener("click", () => {
      _onActionDelete(a.id);
    });

    chip.appendChild(colorInput);
    chip.appendChild(nameSpan);
    chip.appendChild(meta);
    chip.appendChild(delBtn);
    chip.addEventListener("click", (e) => {
      if (
        e.target === colorInput ||
        e.target === nameSpan ||
        e.target === delBtn
      )
        return;
      _onActionSelect(a.id);
    });
    legendEl.appendChild(chip);
  });

  const emptyPct = (((sums["_empty"] || 0) / TOTAL_COMBOS) * 100).toFixed(1);
  document.getElementById("totals").textContent =
    `Sin acción asignada: ${(sums["_empty"] || 0).toFixed(1)} combos (${emptyPct}%) · Total: 1326 combos`;

  document
    .getElementById("eraserBtn")
    .classList.toggle("active", activeId === null && mode === "quick");
  document
    .getElementById("quickModeBtn")
    .classList.toggle("active", mode === "quick");
  document
    .getElementById("percentModeBtn")
    .classList.toggle("active", mode === "percent");
}

/**
 * Update the #modeHint subtitle text to reflect the current mode.
 */
export function updateModeHint() {
  document.getElementById("modeHint").textContent =
    mode === "quick"
      ? "Modo pintura rápida: click o arrastrá para pintar una celda al 100% con la acción activa."
      : "Modo editor de porcentaje: click en una celda para repartir su porcentaje entre varias acciones.";
}
