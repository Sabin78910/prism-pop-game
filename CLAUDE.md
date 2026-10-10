# Prism Pop
Purpose: Original match-3 gem puzzle (React, TS, Vite, Canvas 2D). Web PWA + Android via Capacitor.

## Commands
- Test: `npm test`
- Lint: `npm run lint && npm run typecheck`
- Build: `npm run build`

## Architecture
- src/game/ — pure engine: board.ts (matches, hints, shuffle), resolve.ts (moves, specials, cascades),
  level.ts (seeded procedural levels + daily), session.ts (one level's state), progress.ts (save data). All tested.
- src/GameCanvas.tsx — renderer + input (canvas, sprites, particles); src/App.tsx — screens; src/audio.ts — synth SFX.

## Rules
- Read only the files you need; do not scan the whole repo.
- Every behavior change needs a test. Run tests and lint before finishing.
- Fair design: no lives/energy system, no forced ads, respect reduced motion. Never copy art or names from other games.
- No new dependencies, permissions, or signing/secrets changes without asking.
- Never commit secrets, keystores, .env files, or email addresses.
- Keep PRs under ~300 changed lines; one issue per PR.
- If tests still fail after 3 attempts, stop and report the blocker.

## Definition of done
Lint clean, tests pass, CI green, short summary, PR opened as draft.
