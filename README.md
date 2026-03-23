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
- `src/VehicleSimulation.tsx` — the full simulation: road drawing, vehicle physics, traffic light logic, and React controls

All animation state is kept in `useRef` to avoid per-frame re-renders. The `requestAnimationFrame` loop ticks physics then draws — road first, traffic lights (stop lines + lamps), then all vehicles depth-sorted by Y for correct overlap at the intersection.

## Tech stack

- [Bun](https://bun.com) — runtime, bundler, and test runner
- [React 19](https://react.dev) — UI and controls
- Canvas 2D API — all simulation rendering
