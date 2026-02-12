<!-- .github/copilot-instructions.md - project-specific guidance for AI coding agents -->
# Project snapshot & agent guidance

This repository is a small Bun + React template with a built-in Bun server and a client-side React UI.

- **Server entry:** [src/index.ts](src/index.ts) — implements Bun `serve()` and registers routes under `routes:`. API endpoints live under `/api/*`.
- **Client entry:** [src/frontend.tsx](src/frontend.tsx) — mounts the React tree into `#root`. Included by [src/index.html](src/index.html).
- **Main UI:** [src/App.tsx](src/App.tsx) with a small helper component [src/APITester.tsx](src/APITester.tsx). Styles in [src/index.css](src/index.css).
- **Build / Scripts:** Check [package.json](package.json) — primary commands are `bun dev`, `bun build`, and `bun start` (see details below).

## Big picture / architecture

- Single-repo app combining an HTTP server (Bun) and a browser SPA. The server serves `index.html` for all unmatched routes and exposes API endpoints in the same process.
- Data flow: browser UI (frontend.tsx → App) calls API endpoints at `/api/...` served by the same Bun server in `src/index.ts` (examples: `/api/hello`, `/api/hello/:name`).
- HMR: development mode enables HMR (see `development` option in [src/index.ts](src/index.ts)). The client code checks `import.meta.hot` in [src/frontend.tsx](src/frontend.tsx) and reuses `hot.data.root`.

## Developer workflows (concrete commands)

- Install: `bun install`
- Dev server (with HMR + Bun server): `bun dev` — this runs the `dev` script (`bun --hot src/index.ts`).
- Build production bundle: `bun build ./src/index.html --outdir=dist --sourcemap --target=browser --minify --define:process.env.NODE_ENV='"production"' --env='BUN_PUBLIC_*'` (this is the `build` script in `package.json`).
- Start production server: `bun start` (runs `NODE_ENV=production bun src/index.ts`). Note: the `start` script uses POSIX env assignment; on Windows PowerShell use:

```powershell
$Env:NODE_ENV='production'
bun src/index.ts
```

## Project-specific conventions & patterns

- API routes are defined inline in the `routes` map in `src/index.ts`. To add an endpoint, add an entry to that map (e.g., `"/api/foo": { async GET(req){...} }`).
- The server uses Bun's `Response.json(...)` and route parameter syntax like `/api/hello/:name` — expect `req.params` for path params.
- Client HMR pattern: preserve the React root on hot updates by using `import.meta.hot.data.root` as done in [src/frontend.tsx](src/frontend.tsx).
- Public environment variables: the build command passes `--env='BUN_PUBLIC_*'`. Use `BUN_PUBLIC_` prefix for variables that should be exposed to the client during build.

## Where to make common changes

- Add/remove API endpoints: edit [src/index.ts](src/index.ts).
- Change UI components/styles: edit [src/App.tsx](src/App.tsx), [src/APITester.tsx](src/APITester.tsx), or [src/index.css](src/index.css).
- Change page template or script includes: edit [src/index.html](src/index.html) (it includes `./frontend.tsx`).

## Important environment and platform notes

- Runtime is Bun (not Node). Use `bun` for install/dev/build. The `dev` script relies on `bun --hot`.
- `package.json` scripts assume a POSIX shell for inline env assignment; on Windows prefer PowerShell syntax shown above.

## Small examples (copy/paste friendly)

- Add a simple GET endpoint in `src/index.ts`:

```ts
"/api/ping": {
  async GET() { return Response.json({ ok: true, time: Date.now() }); }
}
```

- Call that endpoint from the client (fetch example used by `APITester`): use relative URLs like `/api/ping` so they resolve against the server origin.

## What not to change without verification

- Avoid changing `src/index.ts` routing semantics or removing `"/*": index` without ensuring SPA fallback is preserved.
- Don’t assume `NODE_ENV` is set on Windows shells; scripts in `package.json` may need adjustment for cross-platform CI.

---
If anything in this guide is unclear or if you want me to surface more detailed examples (tests, CI snippets, or a suggested cross-platform `start` script), tell me which part to expand.  
Please review and indicate any missing locations or conventions to include.
