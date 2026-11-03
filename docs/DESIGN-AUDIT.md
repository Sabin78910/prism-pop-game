# Prism Pop design audit

This audit scores the app against `docs/DESIGN-SYSTEM.md`. It has 20 criteria worth 5 points each. "Before" is
`main` at 7914882. "After" is the studio UI redesign (#45) plus the count-up and coin flight follow-up. Each score was checked on the built app at 390×844 with
Playwright, with no console errors.

| # | Criterion | Before | After | Evidence after |
| --- | --- | --- | --- | --- |
| 1 | Full-screen home scene, no scrolling page | 1 | 5 | `Scenery` sky, stars and skyline behind every screen |
| 2 | Currency bar (coins, stars, settings) | 2 | 5 | `.topbar` pills with overlapping icons |
| 3 | Play is the dominant action | 2 | 5 | `btn--play`, breathing, with the level number |
| 4 | Bottom tab bar | 0 | 5 | Levels, Home and Goals tabs with a claim badge |
| 5 | Beveled, tactile buttons | 2 | 5 | Outline, bevel and highlight; press sinks into the bevel |
| 6 | Solid outlined panels, no frosted glass | 1 | 5 | `.panel` gradient with outline and inner edge |
| 7 | Outlined display type | 1 | 5 | Fredoka 700 with a 3px stroke and a drop shadow |
| 8 | Custom toggles, no native checkboxes | 0 | 5 | `Toggle` with `role="switch"` |
| 9 | No native `confirm` dialogs | 0 | 5 | `Confirm` sheet for resetting progress |
| 10 | HUD goals as icons with counts | 2 | 5 | `goalStatus` drives the tile, which ticks to a check |
| 11 | Moves badge with a low warning | 2 | 5 | Pink and pulsing at 5 moves or fewer, never colour alone |
| 12 | Framed star meter | 2 | 5 | `.score` track with three star marks |
| 13 | Framed board | 2 | 5 | Board frame in the world accent |
| 14 | Booster dock | 2 | 5 | Round wells with count bubbles |
| 15 | Map as a road through scenery | 2 | 5 | Dashed road, glowing current node, stars under nodes |
| 16 | Result ribbon and star slots | 2 | 5 | Gold or pink ribbon, slots that fill in turn, confetti |
| 17 | Goal preview before play | 0 | 5 | Preview sheet with the goal and any new mechanic |
| 18 | Per-world scenery | 3 | 5 | Five skylines and accents, aurora in the Spire |
| 19 | Motion on state changes, with reduced motion | 3 | 5 | Spring sheets, star fill, press squash, coins fly to the wallet, numbers count up |
| 20 | Accessibility | 4 | 5 | Focus rings, 48px targets, AA text, labelled switches, Escape closes sheets |
| | **Total** | **33** | **100** | |

## Closing the last point

Score, coin rewards and the wallet now count up (`countUp.ts`, 300 to 1200ms, ease-out), and coins fly from
a reward or a claimed mission into the wallet. Both are skipped with reduced motion, and the final value is
always shown exactly.

## What this audit does not cover

It is a visual and interaction audit against our own system, not a playtest. It does not measure retention,
store conversion, or how the app feels on a low-end phone. Those need real devices and real players.
