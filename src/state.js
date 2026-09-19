import { POSITIONS } from "./hands.js";

/** Total number of distinct poker combos. */
export const TOTAL_COMBOS = 1326;

/** localStorage key for persisting app state. */
export const STORAGE_KEY = "rangeBuilderStateV5";

// ── Game Modes (poker format types) ──────────────────────────────────────────

/** Predefined game modes representing different poker formats. */
export const GAME_MODES = [
  { id: "cash", name: "Cash Game", color: "#10b981" },
  { id: "tournament", name: "Tournament", color: "#f59e0b" },
  { id: "spingo", name: "Spin Go", color: "#8b5cf6" },
  { id: "husng", name: "HU SnG", color: "#ef4444" },
];

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

/** Currently selected game mode ID. */
export let currentGameMode = "cash";

/**
 * Map of gameMode → position → { [extraActionId || "rfi"]: 13×13 grid }.
 * Each game mode has its own independent set of position grids.
 */
export let positionGrids = {};

/**
 * Initialize empty positionGrids for all game modes.
 */
function initAllModeGrids() {
  GAME_MODES.forEach((mode) => {
    positionGrids[mode.id] = {};
    POSITIONS.forEach((p) => {
      positionGrids[mode.id][p] = {
        rfi: createEmptyGrid(),
      };
      EXTRA_ACTIONS.forEach((ea) => {
        positionGrids[mode.id][p][ea.id] = createEmptyGrid();
      });
    });
  });
}

// Initialize on module load
initAllModeGrids();

/** Shorthand reference to the grid for currentPosition + currentExtraAction. */
export let grid = getGridForCurrentContext();

/** Whether the pointer is currently down (for drag-painting). */
export let isPointerDown = false;

/**
 * Get the grid for the current game mode, position, and extra action context.
 * @returns {Array<Array<{ freqs: Record<string, number> }>>}
 */
function getGridForCurrentContext() {
  const modeGrids = positionGrids[currentGameMode];
  if (!modeGrids) return createEmptyGrid();
  const posGrids = modeGrids[currentPosition];
  if (!posGrids) return createEmptyGrid();
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
 * Silently ignores corrupted data. Migrates V3/V4 format to V5 if needed.
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Also check for V4 key and migrate if found
      const v4Raw = localStorage.getItem("rangeBuilderStateV4");
      if (v4Raw) {
        migrateV4ToV5(v4Raw);
      }
      return;
    }
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
    if (parsed.currentGameMode && GAME_MODES.find(m => m.id === parsed.currentGameMode))
      currentGameMode = parsed.currentGameMode;
    
    // V5 format: positionGrids is nested by game mode
    if (parsed.positions && typeof parsed.positions === "object") {
      // Check if this is V5 format (has game mode keys)
      const firstKey = Object.keys(parsed.positions)[0];
      if (firstKey && GAME_MODES.find(m => m.id === firstKey)) {
        // V5 format: already nested by game mode
        GAME_MODES.forEach((mode) => {
          if (parsed.positions[mode.id]) {
            POSITIONS.forEach((p) => {
              if (parsed.positions[mode.id][p]) {
                positionGrids[mode.id][p] = parsed.positions[mode.id][p];
              }
            });
          }
        });
      } else if (firstKey && POSITIONS.includes(firstKey)) {
        // V4 format: positions directly (no game mode nesting)
        // Migrate to Cash mode
        POSITIONS.forEach((p) => {
          if (parsed.positions[p]) {
            if (Array.isArray(parsed.positions[p])) {
              // V3 flat format
              positionGrids["cash"][p] = { rfi: parsed.positions[p] };
              EXTRA_ACTIONS.forEach((ea) => {
                if (!positionGrids["cash"][p][ea.id])
                  positionGrids["cash"][p][ea.id] = createEmptyGrid();
              });
            } else {
              // V4 format with extra actions
              positionGrids["cash"][p] = parsed.positions[p];
            }
          }
        });
      }
    }
    grid = getGridForCurrentContext();
  } catch (e) {
    /* ignore corrupted state */
  }
}

/**
 * Migrate V4 format data to V5 (Cash mode).
 * @param {string} v4Raw - Raw JSON string from V4 storage
 */
function migrateV4ToV5(v4Raw) {
  try {
    const parsed = JSON.parse(v4Raw);
    const v5Data = {
      actions: parsed.actions || actions,
      activeId: parsed.activeId || activeId,
      currentPosition: parsed.currentPosition || currentPosition,
      currentExtraAction: parsed.currentExtraAction,
      currentGameMode: "cash",
      positions: { cash: {} },
    };
    
    if (parsed.positions) {
      POSITIONS.forEach((p) => {
        if (parsed.positions[p]) {
          if (Array.isArray(parsed.positions[p])) {
            v5Data.positions.cash[p] = { rfi: parsed.positions[p] };
            EXTRA_ACTIONS.forEach((ea) => {
              if (!v5Data.positions.cash[p][ea.id])
                v5Data.positions.cash[p][ea.id] = createEmptyGrid();
            });
          } else {
            v5Data.positions.cash[p] = parsed.positions[p];
          }
        }
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v5Data));
    // Apply the migrated data
    if (v5Data.actions) actions = v5Data.actions;
    if (v5Data.activeId) activeId = v5Data.activeId;
    if (v5Data.currentPosition) currentPosition = v5Data.currentPosition;
    currentGameMode = "cash";
    POSITIONS.forEach((p) => {
      if (v5Data.positions.cash[p]) {
        positionGrids["cash"][p] = v5Data.positions.cash[p];
      }
    });
    grid = getGridForCurrentContext();
  } catch (e) {
    /* ignore migration errors */
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
          currentGameMode,
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
 * Switch to a different game mode and update the grid reference.
 * @param {string} modeId - Game mode ID.
 */
export function setCurrentGameMode(modeId) {
  if (GAME_MODES.find(m => m.id === modeId)) {
    currentGameMode = modeId;
    grid = getGridForCurrentContext();
  }
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
  GAME_MODES.forEach((mode) => {
    POSITIONS.forEach((p) => {
      Object.keys(positionGrids[mode.id][p]).forEach((gridKey) => {
        for (let i = 0; i < 13; i++)
          for (let j = 0; j < 13; j++)
            delete positionGrids[mode.id][p][gridKey][i][j].freqs[actionId];
      });
    });
  });
}

/**
 * Clear the current position's grid (for current extra action context) and update the grid reference.
 */
export function clearCurrentGrid() {
  const gridKey = currentExtraAction || "rfi";
  positionGrids[currentGameMode][currentPosition][gridKey] = createEmptyGrid();
  grid = getGridForCurrentContext();
}
