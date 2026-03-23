# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install      # Install dependencies
bun dev          # Start dev server with HMR at http://localhost:3000
bun start        # Run production server
bun build        # Build to dist/ for deployment
bun test         # Run all tests
bun test App.test.ts  # Run a single test file
```

## Architecture

**Runtime**: Bun serves as both the HTTP server and build tool — no Vite/webpack.

**Entry points**:
- `src/index.ts` — Bun HTTP server; serves `src/index.html` for all routes and defines `/api/*` route handlers
- `src/index.html` — HTML shell that loads `src/frontend.tsx` as the React entry point
- `src/frontend.tsx` — React root; mounts `<App>` with HMR support via `import.meta.hot`

**Component tree**: `App` (dark background layout) → `VehicleSimulation` (the main feature)

**`VehicleSimulation.tsx`** is a self-contained Canvas-based traffic simulation with no external dependencies beyond React. Key internals:
- `LANES` — 5 lanes with direction (`1` = right, `-1` = left) and y-positions
- `DEFS` — per-vehicle-type physics constants (speed, acceleration, gap)
- `Vehicle` interface — mutable state per vehicle (position, speed, lane, animation)
- `tickVehicles()` — pure physics update: gap-following, speed smoothing, wrapping, wheel rotation, bicycle wobble
- `drawRoad()` / `draw*()` — imperative Canvas 2D drawing; all vehicle draw functions assume ctx is translated to vehicle center and horizontally flipped for left-going vehicles
- Animation runs in `requestAnimationFrame`; state is in `useRef` (not `useState`) to avoid re-renders per frame

**Tests** (`App.test.ts`, `App.integration.test.ts`): Unit and integration tests for a calculator `calculate()` function using `bun:test`. These tests are standalone (no DOM needed).
