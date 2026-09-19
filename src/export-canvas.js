import { handLabel } from "./hands.js";
import { grid, actions, currentPosition, currentExtraAction, currentGameMode, EXTRA_ACTIONS, GAME_MODES, TOTAL_COMBOS } from "./state.js";
import { comboSums, colorOf } from "./render.js";

// ── Canvas helpers ───────────────────────────────────────────────────────────

/**
 * Trace a rounded-rectangle path on a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r - corner radius
 */
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Build an off-screen canvas with the full range grid, legend, and totals.
 * @returns {HTMLCanvasElement}
 */
function buildExportCanvas() {
  const styles = getComputedStyle(document.documentElement);
  const bg = (styles.getPropertyValue("--panel") || "#121c2e").trim();
  const textColor = (
    styles.getPropertyValue("--text") || "#e8ecf3"
  ).trim();
  const muted = (
    styles.getPropertyValue("--muted") || "#94a1b8"
  ).trim();
  const emptyColor = (
    styles.getPropertyValue("--cell-empty") || "#1b2740"
  ).trim();
  const borderColor = (
    styles.getPropertyValue("--cell-border") || "#2c3a56"
  ).trim();

  const CELL = 74,
    GAP = 3,
    PAD_X = 28,
    PAD_TOP = 28,
    TITLE_H = 34,
    LEGEND_GAP_TOP = 16,
    LEGEND_ROW_H = 30,
    TOTALS_H = 26,
    GRID_TOP_GAP = 20,
    PAD_BOTTOM = 26;
  const gridSize = 13 * CELL + 12 * GAP;
  const width = gridSize + PAD_X * 2;
  const legendHeight = actions.length * LEGEND_ROW_H;
  const height =
    PAD_TOP +
    TITLE_H +
    LEGEND_GAP_TOP +
    legendHeight +
    TOTALS_H +
    GRID_TOP_GAP +
    gridSize +
    PAD_BOTTOM;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  let cursorY = PAD_TOP;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = textColor;
  ctx.font = "700 22px -apple-system, Segoe UI, Roboto, sans-serif";
  
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
  ctx.fillText(title, PAD_X, cursorY);
  cursorY += TITLE_H + LEGEND_GAP_TOP;

  const sums = comboSums();
  actions.forEach((a) => {
    ctx.fillStyle = a.color;
    ctx.fillRect(PAD_X, cursorY + 4, 16, 16);
    ctx.fillStyle = textColor;
    ctx.font = "600 15px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(a.name, PAD_X + 24, cursorY + 3);
    const nameWidth = ctx.measureText(a.name).width;
    const combos = sums[a.id] || 0;
    const pct = ((combos / TOTAL_COMBOS) * 100).toFixed(1);
    ctx.fillStyle = muted;
    ctx.font = "400 13px -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(
      `   ${combos.toFixed(1)} combos · ${pct}%`,
      PAD_X + 24 + nameWidth,
      cursorY + 4,
    );
    cursorY += LEGEND_ROW_H;
  });

  const emptyPct = (((sums["_empty"] || 0) / TOTAL_COMBOS) * 100).toFixed(1);
  ctx.fillStyle = muted;
  ctx.font = "400 13px -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(
    `Sin acción asignada: ${(sums["_empty"] || 0).toFixed(1)} combos (${emptyPct}%) · Total: 1326 combos`,
    PAD_X,
    cursorY + 4,
  );
  cursorY += TOTALS_H + GRID_TOP_GAP;

  const gridTop = cursorY;
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      const x = PAD_X + j * (CELL + GAP);
      const y = gridTop + i * (CELL + GAP);
      const cell = grid[i][j];

      roundRectPath(ctx, x, y, CELL, CELL, 5);
      ctx.save();
      ctx.clip();
      ctx.fillStyle = emptyColor;
      ctx.fillRect(x, y, CELL, CELL);

      const entries = Object.entries(cell.freqs).filter(
        ([id, f]) => f > 0.0001 && colorOf(id),
      );
      if (entries.length > 0) {
        const cx = x + CELL / 2,
          cy = y + CELL / 2;
        const r = CELL * 0.8;
        let angle = -Math.PI / 2;
        entries.forEach(([id, f]) => {
          const sweep = f * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, angle, angle + sweep);
          ctx.closePath();
          ctx.fillStyle = colorOf(id);
          ctx.fill();
          angle += sweep;
        });
      }
      ctx.restore();

      roundRectPath(ctx, x, y, CELL, CELL, 5);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      const label = handLabel(i, j);
      ctx.font = "700 13px -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.strokeText(label, x + CELL / 2, y + CELL / 2);
      ctx.fillStyle = "#111318";
      ctx.fillText(label, x + CELL / 2, y + CELL / 2);
    }
  }
  return canvas;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the JPG export button listener. Call once at app startup.
 * @param {(msg: string) => void} showToast - Toast notification callback
 */
export function initExport(showToast) {
  document
    .getElementById("exportBtn")
    .addEventListener("click", async () => {
      try {
        const canvas = buildExportCanvas();
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              showToast("No se pudo generar la imagen.");
              return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            try {
              let filename = `${currentGameMode}-${currentPosition}`;
              if (currentExtraAction) {
                const ea = EXTRA_ACTIONS.find((e) => e.id === currentExtraAction);
                if (ea) filename += `-vs-${ea.id}`;
              }
              a.download = `${filename}.jpg`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              showToast("Imagen guardada.");
            } catch (err) {
              console.error("Error: ", err);
              showToast("No se pudo guardar la imagen.");
            }
          },
          "image/jpeg",
          0.95,
        );
      } catch (e) {
        showToast("No se pudo generar la imagen.");
      }
    });
}
