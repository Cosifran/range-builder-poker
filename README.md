# Range Builder

Herramienta de construcción de rangos preflop. Vite + ES modules.

## Cómo usarlo en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173/` en tu navegador.

## Estructura

```
index.html              ← HTML limpio (solo markup)
src/
  main.js               ← Entry point, wiring de callbacks
  hands.js              ← Lógica de manos de poker (labels, combos)
  state.js              ← Estado mutable + persistencia (localStorage)
  render.js             ← Rendering del DOM (grid, positions, legend)
  editor.js             ← Editor de porcentaje por celda
  import-range.js       ← Importación notación PioSolver
  export-canvas.js      ← Exportación a JPG vía canvas
  style.css             ← Estilos
```

## Comandos

- `npm run dev` — desarrollo con hot reload
- `npm run build` — build de producción en `dist/`
- `npm run preview` — preview del build de producción

## Notas

- El estado (rangos por posición, acciones, colores) se guarda en `localStorage` del navegador.
- `buildExportCanvas()` arma la imagen de exportación dibujando directamente en un `<canvas>` sin dependencias externas.
