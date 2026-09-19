# Feature: Game Modes

## Objective
Add a game mode selector so users can maintain separate ranges for different poker formats: Cash Games, Tournaments, Spin Go, and HU SnG.

## Problem
Currently all ranges live under a single flat structure. Users who play multiple formats need to manually recreate ranges when switching formats.

## Scope
- Add 4 game modes: Cash, Tournament, Spin Go, HU SnG
- Each mode has its own independent set of position ranges
- Game mode selector UI at the top of the app
- Persist game mode selection in localStorage
- Export includes game mode in title and filename

## Constraints
- Backward compatible: existing V4 data migrates cleanly to V5
- No external dependencies
- Minimal performance impact

## Tasks

### Task 1: Add GAME_MODES constant and currentGameMode state
- Add `GAME_MODES` array with id, name, color
- Add `currentGameMode` state variable
- Add `setCurrentGameMode()` mutator
- **Files**: `src/state.js`

### Task 2: Restructure positionGrids to nest by game mode
- Change structure from `positionGrids[position][action]` to `positionGrids[gameMode][position][action]`
- Initialize empty grids for all modes on first load
- **Files**: `src/state.js`

### Task 3: Add V4→V5 localStorage migration
- Detect old V4 format (positions directly, no gameMode key)
- Migrate existing data to Cash mode (default)
- Update STORAGE_KEY to `rangeBuilderStateV5`
- **Files**: `src/state.js`

### Task 4: Add game mode selector UI
- Add game mode bar above position bar in HTML
- **Files**: `index.html`

### Task 5: Add renderGameModes() function
- Render game mode buttons similar to position buttons
- Highlight active mode
- **Files**: `src/render.js`

### Task 6: Wire up game mode callbacks in main.js
- Import new state/functions
- Add handleGameModeChange callback
- Call renderGameModes on init and mode change
- **Files**: `src/main.js`

### Task 7: Update export-canvas.js
- Include game mode name in canvas title
- Include game mode in export filename
- **Files**: `src/export-canvas.js`

### Task 8: Add CSS styles
- Style game mode selector bar
- Match existing design language
- **Files**: `src/style.css`

## Acceptance Criteria
- [ ] Game mode selector visible at top of app
- [ ] Switching modes loads correct ranges
- [ ] Each mode maintains independent ranges
- [ ] Existing data migrates to Cash mode
- [ ] Export includes game mode in title and filename
- [ ] Build compiles without errors
