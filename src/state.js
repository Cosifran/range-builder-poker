import { POSITIONS } from "./hands.js";

/** Total number of distinct poker combos. */
export const TOTAL_COMBOS = 1326;

/** localStorage key for persisting app state. */
export const STORAGE_KEY = "rangeBuilderStateV4";

// ── Extra Actions (opponent actions that require different ranges) ───────────

/** Predefined extra actions representing opponent betting actions. */
export const EXTRA_ACTIONS = [
  { id: "3bet", name: "3BET", color: "#f97316" },
  { id: "3bet_call", name: "3BET + CALL", color: "#a855f7" },
  { id: "squeeze", name: "SQUEEZE", color: "#ec4899" },
  { id: "cold4bet", name: "COLD4BET", color: "#ef4444" },
];

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

/** Currently selected extra action ID, or null for default RFI range. */
export let currentExtraAction = null;

/**
 * Map of position string → { [extraActionId || "rfi"]: 13×13 grid }.
 * The "rfi" key holds the default RFI range for each position.
 * Extra action keys hold ranges for when facing that specific opponent action.
 */
export let positionGrids = {};
POSITIONS.forEach((p) => {
  positionGrids[p] = {
    rfi: createEmptyGrid(),
  };
  EXTRA_ACTIONS.forEach((ea) => {
    positionGrids[p][ea.id] = createEmptyGrid();
  });
});

/** Shorthand reference to the grid for currentPosition + currentExtraAction. */
export let grid = getGridForCurrentContext();

/** Whether the pointer is currently down (for drag-painting). */
export let isPointerDown = false;

/**
 * Get the grid for the current position and extra action context.
 * @returns {Array<Array<{ freqs: Record<string, number> }>>}
 */
function getGridForCurrentContext() {
  const posGrids = positionGrids[currentPosition];
  if (currentExtraAction && posGrids[currentExtraAction]) {
    return posGrids[currentExtraAction];
  }
  return posGrids.rfi;
}

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
 * Silently ignores corrupted data. Migrates V3 format to V4 if needed.
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
    if (parsed.currentExtraAction !== undefined)
      currentExtraAction = parsed.currentExtraAction;
    if (parsed.positions) {
      POSITIONS.forEach((p) => {
        if (parsed.positions[p]) {
          // Migrate V3 format (flat grid) to V4 (object with rfi + extra actions)
          if (Array.isArray(parsed.positions[p])) {
            positionGrids[p] = { rfi: parsed.positions[p] };
            EXTRA_ACTIONS.forEach((ea) => {
              if (!positionGrids[p][ea.id])
                positionGrids[p][ea.id] = createEmptyGrid();
            });
          } else {
            positionGrids[p] = parsed.positions[p];
          }
        }
      });
    }
    grid = getGridForCurrentContext();
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
          currentExtraAction,
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
  grid = getGridForCurrentContext();
}

/**
 * Switch to a different extra action context and update the grid reference.
 * @param {string|null} eaId - Extra action ID, or null for default RFI range.
 */
export function setCurrentExtraAction(eaId) {
  currentExtraAction = eaId;
  grid = getGridForCurrentContext();
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
    Object.keys(positionGrids[p]).forEach((gridKey) => {
      for (let i = 0; i < 13; i++)
        for (let j = 0; j < 13; j++)
          delete positionGrids[p][gridKey][i][j].freqs[actionId];
    });
  });
}

/**
 * Clear the current position's grid (for current extra action context) and update the grid reference.
 */
export function clearCurrentGrid() {
  const gridKey = currentExtraAction || "rfi";
  positionGrids[currentPosition][gridKey] = createEmptyGrid();
  grid = getGridForCurrentContext();
}
