# Prism Pop – launch QA & security report

**Build:** 1.0.0 · web build wrapped with Capacitor · target API 36 once PR #29 is merged (main is still API 35)
**Date:** 3 Nov 2026 · **Checked:** `main` at b5385ce, and `main` with PR #29 (API 36) + PR #30 (missions, trophies, store art) merged together locally
**Automated checks:** lint clean, typecheck clean, tests 79/79 on `main` and 86/86 with #29 + #30, `npm run build` OK (main JS 86 KB gzipped, budget 180 KB), `npx cap sync android` OK, `Android AAB` release build green on the API 36 branch

## 1. Release blockers

| # | Item | Status |
|---|---|---|
| B1 | Target API 36 (Play rejects new apps targeting 35) | PR #29. The `Android AAB` workflow built the release bundle on its branch (3 Nov 2026, green; unsigned until B4). |
| B2 | Privacy policy covers Prism Pop and its sync | privacy-policy PR #3 (stacked on #2, Ludo Live). |
| B3 | Store icon, feature graphic, screenshots | PR #30 (`store/`). |
| B4 | Signed AAB | Add the `KEYSTORE_*` repo secrets (steps in `docs/PLAY-RELEASE.md` from PR #29). Without them the AAB is unsigned and Play rejects it. |
| B5 | Closed test | Personal developer accounts made after Nov 2023 need 12 testers for 14 days before Production. |

## 2. UAT checklist (run on a phone with the first signed build)

| # | Scenario | Result |
|---|---|---|
| 1 | First launch: home, level map, level 1 starts | ⏭ To run on device |
| 2 | Swap, match, cascade, combo words, power gems and combos | ✅ Engine covered by unit tests · ⏭ feel on device |
| 3 | Win and lose a level: stars, coins, result screen | ✅ Unit tests (`meta.test.ts`) · ⏭ on device |
| 4 | Daily challenge: same board for everyone, streak counts | ✅ Unit tests |
| 5 | Boosters: hammer, shuffle, +5 moves, refused without coins | ✅ Unit tests |
| 6 | Daily missions and trophies (PR #30) | ✅ Unit tests (`missions.test.ts`, `trophies.test.ts`) |
| 7 | Sync on: code created, second device joins, progress merges without losing a level, star or coin | ✅ Unit tests (`sync.test.ts`) · ⏭ two real devices |
| 8 | Airplane mode: game fully playable, sync shows "Offline" and catches up later | ⏭ To run on device |
| 9 | Android back button on a level and on home | ⏭ To run on device |
| 10 | Kill the app mid-level and reopen: coins, stars kept | ⏭ To run on device |
| 11 | Nepali language, reduced motion, sound and vibration toggles | ✅ Every Nepali string exists, haptics setting respected (`ui.test.ts`) · ⏭ toggles on device |
| 12 | Privacy policy link in Settings opens | ✅ Link points to sabin78910.github.io/privacy-policy |

## 3. Security review

### Passed
- Only permission: `INTERNET` (used only by optional sync).
- Release build is not debuggable; Capacitor serves the app over `https://localhost`, and the only network host is the sync API over HTTPS.
- Only the launcher activity is exported; the FileProvider is not exported.
- No secrets, keystores or `.env` files in the repo. Upload key comes from CI secrets only.
- Sync is end-to-end encrypted (AES-256-GCM, HKDF keys from the sync code; the app name is bound as associated data). The server sees only ciphertext.
- `npm audit --omit=dev`: 0 vulnerabilities in what ships.

### Findings
| ID | Severity | Finding | Status / recommendation |
|---|---|---|---|
| P1 | Low | Dev-only dependencies (Capacitor CLI, test tooling) have audit findings (glob, minimatch, undici). They are not in the app. | PR #32 clears them. |
| P2 | Low | No Content-Security-Policy in `index.html`. | Add a strict CSP with `connect-src 'self' https://sync-api.sabin-apps.workers.dev` in a follow-up, tested in the Android WebView. |
| P3 | Low | Anyone holding a sync code can read and change that progress. | Accepted: the UI already says to keep it private. No other player is affected. |
| P4 | Info | Coins and stars are in localStorage and editable on a rooted device. | Accepted: no leaderboards, purchases or effect on other players, so no server score check is needed (unlike Block Drop's V1). |
| P5 | Info | `allowBackup` is on, so progress can come back via Google backup. | Accepted: a benefit. |
