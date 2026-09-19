/** Poker hand ranks from Ace (highest) to 2 (lowest). */
export const RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];

/** Available table positions for RFI ranges. */
export const POSITIONS = ["SB","UTG","UTG1","UTG2","LJ","HJ","CO","BTN"];

/**
 * Build a human-readable label for a hand at grid position (i, j).
 * Pairs are "AA", suited hands get "s", offsuit hands get "o".
 * @param {number} i - Row index (higher rank)
 * @param {number} j - Column index (lower rank)
 * @returns {string} e.g. "AKs", "AKo", "AA"
 */
export function handLabel(i, j) {
  if (i === j) return RANKS[i] + RANKS[i];
  const hi = Math.min(i, j);
  const lo = Math.max(i, j);
  return RANKS[hi] + RANKS[lo] + (i < j ? "s" : "o");
}

/**
 * Return the number of distinct combos for a hand at grid position (i, j).
 * Pairs have 6 combos, suited hands have 4, offsuit hands have 12.
 * @param {number} i
 * @param {number} j
 * @returns {number}
 */
export function comboCount(i, j) {
  return i === j ? 6 : i < j ? 4 : 12;
}

/**
 * Normalize a hand token string (e.g. "AKs", "TT", "98o") to canonical form.
 * Returns null if the token is invalid.
 * @param {string} raw
 * @returns {string|null}
 */
export function normalizeHandToken(raw) {
  const t = raw.trim();
  if (!t) return null;
  if (t.length === 2) return t[0].toUpperCase() + t[1].toUpperCase();
  if (t.length === 3)
    return t[0].toUpperCase() + t[1].toUpperCase() + t[2].toLowerCase();
  return null;
}

/**
 * Map from hand label string to grid coordinates { i, j }.
 * Built once at module load from RANKS.
 */
export const labelToCell = {};
for (let i = 0; i < 13; i++)
  for (let j = 0; j < 13; j++) labelToCell[handLabel(i, j)] = { i, j };
