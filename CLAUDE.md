# Prism Pop
Original match-3 gem puzzle. No lives, no energy timers, no forced ads.

## Stack
React 19 · TypeScript (strict) · Vite · Vitest · ESLint. Installable PWA with offline support.
Design: night violet #140A2E, six gem colours each with its own shape, Fredoka display.

## Commands
- Dev: `npm run dev` · Build: `npm run build`
- Test: `npm test` · Lint: `npm run lint && npm run typecheck`

## Architecture
- `src/game/` pure engine: board, resolve, level, session, progress · `src/GameCanvas.tsx` render and input

## Data rules
- Progress is in localStorage; `mergeProgress` must never lose a level, star or coin.
- Cross-device sync uses the shared Sabin Labs ID: the sync code in localStorage key `sabin-labs-sync-code`,
  shared by every app on sabin78910.github.io. Never log it or send it anywhere but sync-api.

## Testing rules
- Every behaviour change needs a test. Pure logic in `src/*.ts` is unit-tested; components get the
  behaviour test, not the markup. Run lint, typecheck and tests before finishing.

## Frontend rules
- Keep the existing design system, dark-first with a working light theme. Editorial layouts, not dashboard
  grids. Respect `prefers-reduced-motion`, keep AA contrast and 44px targets.
- Self-host fonts with @fontsource; a Google Fonts link blocks first paint and costs ~2s on mobile.
- Keep gzipped JS under ~180KB and Lighthouse mobile performance at 90+.

## Security and git
- Never commit secrets, keystores, .env files or email addresses.
- Keep the Content-Security-Policy strict; add a host to connect-src only when a feature needs it.
- `main` is protected: branch, open a PR, merge when CI is green. One issue per PR, under ~300 lines.

## Game rules
- Fair by design: no lives, no energy wall, no forced ads. Never copy art or names from another
  game. Each gem colour keeps a distinct shape so colour-blind players can tell them apart.

## Done when
Lint clean, tests pass, CI green, PR opened with a three line summary.
