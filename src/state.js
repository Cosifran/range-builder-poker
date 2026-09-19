import { POSITIONS } from "./hands.js";

/** Total number of distinct poker combos. */
export const TOTAL_COMBOS = 1326;

/** localStorage key for persisting app state. */
export const STORAGE_KEY = "rangeBuilderStateV3";

// ── Mutable state (module-level) ─────────────────────────────────────────────

/** List of actions (colors, names) the user can paint with. */
export let actions = [
  { id: "limp", name: "Limp", color: "#eab308" },
  { id: "raise", name: "Open Raise (3.5bb)", color: "#0ea5e9" },
  { id: "allin", name: "Open Raise All-in", color: "#ef4444" },
];

/** ID of the currently active action, or null for eraser. */
export let activeId = "limp";

/** Current interaction mode: 'quick' (paint) or 'percent' (editor). */
export let mode = "quick";

/** Currently selected table position. */
export let currentPosition = "UTG";

/** Map of position string → 13×13 grid of { freqs: { [actionId]: fraction } }. */
export let positionGrids = {};
POSITIONS.forEach((p) => (positionGrids[p] = createEmptyGrid()));

/** Shorthand reference to the grid for currentPosition. */
export let grid = positionGrids[currentPosition];

/** Whether the pointer is currently down (for drag-painting). */
export let isPointerDown = false;

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Create a fresh 13×13 grid with empty frequency objects.
 * @returns {Array<Array<{ freqs: Record<string, number> }>>}
 */
export function createEmptyGrid() {
  const g = [];
  for (let i = 0; i < 13; i++) {
    g.push([]);
    for (let j = 0; j < 13; j++) g[i].push({ freqs: {} });
  }
  return g;
}

// ── Persistence ──────────────────────────────────────────────────────────────

/**
 * Load persisted state from localStorage into the module-level variables.
 * Silently ignores corrupted data.
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.actions && Array.isArray(parsed.actions))
      actions = parsed.actions;
    if (parsed.activeId) activeId = parsed.activeId;
    if (
      parsed.currentPosition &&
      POSITIONS.includes(parsed.currentPosition)
    )
      currentPosition = parsed.currentPosition;
    if (parsed.positions) {
      POSITIONS.forEach((p) => {
        if (parsed.positions[p]) positionGrids[p] = parsed.positions[p];
      });
    }
    grid = positionGrids[currentPosition];
  } catch (e) {
    /* ignore corrupted state */
  }
}

let saveTimer = null;

/**
 * Debounced write of the current state to localStorage (150 ms).
 */
export function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          actions,
          activeId,
          currentPosition,
          positions: positionGrids,
        }),
      );
    } catch (e) {
      /* storage unavailable, continue silently */
    }
  }, 150);
}

// ── State mutators ───────────────────────────────────────────────────────────

/**
 * Set the current interaction mode.
 * @param {"quick"|"percent"} m
 */
export function setMode(m) {
  mode = m;
}

/**
 * Switch to a different table position and update the grid reference.
 * @param {string} p
 */
export function setCurrentPosition(p) {
  currentPosition = p;
  grid = positionGrids[currentPosition];
}

/**
 * Set the active action ID (or null for eraser).
 * @param {string|null} id
 */
export function setActiveId(id) {
  activeId = id;
}

/**
 * Set whether the pointer is currently held down (for drag-painting).
 * @param {boolean} value
 */
export function setPointerDown(value) {
  isPointerDown = value;
}

/**
 * Remove an action by ID from the actions list and from all position grids.
 * @param {string} actionId
 */
export function removeAction(actionId) {
  actions = actions.filter((x) => x.id !== actionId);
  POSITIONS.forEach((p) => {
    for (let i = 0; i < 13; i++)
      for (let j = 0; j < 13; j++)
        delete positionGrids[p][i][j].freqs[actionId];
  });
}

/**
 * Clear the current position's grid and update the grid reference.
 */
export function clearCurrentGrid() {
  positionGrids[currentPosition] = createEmptyGrid();
  grid = positionGrids[currentPosition];
}
