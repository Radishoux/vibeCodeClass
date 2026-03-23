# Crossroads Traffic Simulation

A real-time 2D traffic simulation built with React and the Canvas 2D API, rendered in the browser via Bun.

## Features

- **Crossroads layout** — 5 horizontal lanes (fast/slow in each direction + an express lane) crossed by 2 vertical lanes (northbound & southbound)
- **3 vehicle types** — trucks, cars, and motorcycles, each with distinct sizes, speeds, acceleration, and braking profiles
- **Realistic gap-following** — vehicles smoothly match the speed of the vehicle ahead and maintain a safe following distance
- **Traffic light system** — 4-phase cycle (H green → H yellow → V green → V yellow) with stop lines and glowing lamp fixtures at each approach
- **Intersection clearing** — vehicles with a green light wait at the stop line until the intersection box is fully clear of crossing traffic before entering
- **Collision prevention** — hard emergency stop and per-frame positional correction ensure vehicles never overlap
- **Interactive controls** — add or remove each vehicle type on the fly; pause/resume the simulation

## Commands

```bash
bun install       # Install dependencies
bun dev           # Start dev server with HMR (hot module reloading)
bun build         # Build to dist/ for production
bun start         # Run production server
bun test          # Run all tests
bun test <file>   # Run a single test file
```

## Architecture

The simulation runs entirely client-side on an HTML5 Canvas (900 × 440 px).

- `src/index.ts` — Bun HTTP server; serves `src/index.html` for all routes
- `src/frontend.tsx` — React entry point, mounts `<App>` with HMR support
- `src/App.tsx` — root layout component
- `src/simulation.ts` — pure simulation logic (no React, no Canvas): lane layout, vehicle specs, spawn helpers, traffic-light signals, and the `tickVehicles` / `tickVVehicles` physics functions; fully unit-testable in isolation
- `src/VehicleSimulation.tsx` — React component that owns the Canvas and the animation loop; imports everything from `simulation.ts` and handles all drawing

All animation state is kept in `useRef` to avoid per-frame re-renders. The `requestAnimationFrame` loop ticks physics then draws — road first, traffic lights (stop lines + lamps), then all vehicles depth-sorted by Y for correct overlap at the intersection.

## Testing

Tests live in `src/simulation.test.ts` and cover:

- Traffic-light signal logic (`hSignal`, `vSignal`, phase durations)
- Spawn helpers (`spawnVehicle`, `spawnVVehicle`, `randomSpeed`, `vDir`, `vLaneX`)
- Gap-following physics (speed reduction, hard stop, positional correction)
- Traffic-light braking (deceleration on red, no slowdown on green)
- Intersection clearing (hold on green while box is occupied)
- Vehicle wrapping (edge-to-edge teleport)

```bash
bun test
```

## CI/CD

Two GitHub Actions workflows run on every push:

| Workflow | Trigger | Steps |
|---|---|---|
| `ci.yml` | All branches & PRs | Install → test → build |
| `deploy.yml` | Push to `main` | Install → **test** → build → deploy to GitHub Pages |

## Tech stack

- [Bun](https://bun.com) — runtime, bundler, and test runner
- [React 19](https://react.dev) — UI and controls
- Canvas 2D API — all simulation rendering
