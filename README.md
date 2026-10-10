# Prism Pop

Original match-3 gem puzzle for web and Android. Swap gems, chain cascades, build power gems
(Line Blaster, Bomb, Prism) and combine them. **No lives, no energy timers, no forced ads.**

**Play:** https://sabin78910.github.io/prism-pop-game/

![CI](https://github.com/Sabin78910/prism-pop-game/actions/workflows/ci.yml/badge.svg)

## Features
- Unlimited seeded levels (score, collect and jelly goals), 1-3 stars, level map
- Daily challenge (same board for everyone that day) with a streak
- Power gems and power-gem combos, cascades with growing combo words, particles, screen shake, synth sound effects, haptics
- Boosters (hammer, shuffle, +5 moves) earned with coins from play
- Six gem colours, each with its own shape, for colour-blind players. Reduced-motion mode. English and नेपाली.
- Installable PWA, works offline

## Develop
```bash
npm ci
npm run dev
npm test
```
The Android app is the same build wrapped with Capacitor (`android/`). CI builds the AAB.

Automation: CI, CodeQL, GitHub Pages deploy, the cloud Claude agent (builds `ready` issues), auto-fix, visual QA and weekly improvements.
