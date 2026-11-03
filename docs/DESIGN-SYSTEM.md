# Prism Pop design system

Prism Pop should look like a game from a top studio, not a web page. This file is the source of truth for
how every screen looks and moves. `docs/DESIGN-AUDIT.md` scores the app against it.

## What the category leaders do

The research covers the top-grossing match-3 games of 2025 and 2026: Royal Match, Royal Kingdom, Candy Crush
Saga, Gardenscapes, Homescapes, Toon Blast, Toy Blast, Fishdom, Lily's Garden and Project Makeover. It draws
on store pages, published UX breakdowns and market reports (see Sources). Their screens share these traits:

1. **Full-screen scenes, not pages.** The home screen is a lit scene, with a currency bar at the top, one
   huge Play button and a bottom tab bar. Nothing scrolls except the level map.
2. **Chunky, tactile controls.** Buttons have a solid gradient fill, a dark outline, a bevel underneath and
   a light edge on top. A pressed button sinks into its bevel. Panels are solid and outlined, not frosted
   glass.
3. **Display type with an outline.** Headings and numbers use a rounded display face with a dark stroke and
   a drop shadow, so they read over any background. Body text is short. The UI is lean, with few text boxes.
4. **Goals as icons.** The level HUD shows each goal as an icon with a remaining count, which ticks to a
   check mark when done. Moves sit in one large badge. Goals are also shown before play starts.
5. **High-contrast primary colours** on a darker, calmer stage, so the board is the brightest thing on screen.
6. **Motion on every state change.** Panels pop in with overshoot, rewards fly to their counter, and buttons
   squash when pressed. Each animation is short (120 to 350ms).
7. **Map as a road.** Levels sit on a drawn path through scenery. The current level is a large glowing
   node, and finished levels show their stars.
8. **Ribbon headers** on result and info dialogs, with stars in slots that fill one by one.

What Prism Pop takes from them: the structure and the craft. What it keeps for itself: the night-prism
setting, its own names, gem shapes that stay readable without colour, and the fairness rules in `FEEL.md`.
It copies no art, names or layouts verbatim.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--night-900` | `#0B0520` | App background, deepest shadow |
| `--night-800` | `#170A3A` | Scene sky |
| `--panel` | `#2B1767 → #1E0F4A` | Panels and sheets (vertical gradient) |
| `--panel-edge` | `#5B3BC4` | Panel outline and inner highlight |
| `--ink` | `#FFFFFF` | Text on dark |
| `--ink-soft` | `#CBBEF5` | Secondary text, AA on panel |
| `--outline` | `#1A0B3B` | Stroke on display text and buttons |
| `--gold` | `#FFD23F` / bevel `#C98A00` | Stars, coins, highlights |
| `--go` | `#4BE37A` / bevel `#178A3E` | Primary action (Play, Next) |
| `--blue` | `#45B4FF` / bevel `#1B62C2` | Secondary action |
| `--pink` | `#FF5C8A` / bevel `#B3244F` | Badges, alerts |

Each world adds an accent (`WORLD_THEME`) for its scenery and board frame. Gem colours stay as in `gemArt.ts`.

## Type

- **Display:** Fredoka 700. Headings, numbers and buttons. Uses a 3px `--outline` stroke (paint-order
  stroke) and a 0 3px 0 shadow. Sizes are 40, 28, 22 and 18.
- **Body:** Inter 600, at 15 to 17px. Used only for descriptions and settings rows.
- **Numbers:** always tabular figures.
- Nepali uses Noto Sans Devanagari at the same weights.

## Shape, depth and spacing

- Radii: 12 (chips), 18 (buttons and tiles), 26 (panels).
- Depth comes from a bevel, not a blur. A button is a gradient fill plus a 3px outline, a 6px solid bevel
  in its darker shade, and a 2px inner top highlight. Panels get a 3px outline, an inner highlight and a
  soft drop shadow.
- Spacing scale: 4, 8, 12, 16, 24 and 32. Tap targets are at least 48px.

## Motion

| Moment | Duration | Curve |
| --- | --- | --- |
| Button press | 90ms down, 160ms up | ease-out, overshoot on release |
| Panel or sheet in | 280ms | `cubic-bezier(.34,1.56,.64,1)` |
| Stars filling | 350ms each, 250ms stagger | same spring |
| Number count-up | scales with the value | ease-out |
| Idle Play button | 2.4s breathe, 3% scale | sine |

With reduced motion, everything still appears but nothing scales, flies or loops.

## Components

- **Button:** `primary` (go), `secondary` (blue), `gold` and `ghost`. The label is display type with a stroke.
- **Panel / Sheet:** solid gradient, outlined, with an optional ribbon header.
- **Ribbon:** a banner with folded ends, used for "Level complete" and "Settings".
- **Currency pill:** the icon overlaps the pill's left edge, with the value in display type.
- **Tab bar:** three tabs (Levels, Play, Daily), with icons above labels. The active tab is raised.
- **Goal tile:** an icon with a count badge, which turns into a check when done.
- **Moves badge:** a large rounded square that turns pink at 5 moves or fewer.
- **Booster button:** a round outlined well with an icon and a count bubble.
- **Toggle:** a 52×32 pill switch. Native checkboxes are never used.
- **Map node:** a beveled circle on a dashed road, with a star row under each finished node.

## Sources

- [Royal Match surpasses Candy Crush in revenue and downloads (Sensor Tower)](https://sensortower.com/blog/royal-match-surpasses-candy-crush-saga-in-revenue-and-downloads-for-the)
- [Top-grossing match-3 titles (Statista)](https://www.statista.com/statistics/1405596/top-grossing-match-3-gaming-titles)
- [Top mobile puzzle games in the 2026 grossing charts (Outlook Respawn)](https://respawn.outlookindia.com/amp/story/gaming/gaming-news/top-mobile-puzzle-games-ruling-the-global-grossing-charts-in-2026)
- [Royal Match: what all designers can learn (Funovus)](https://www.funovus.com/blogs/royal-match-dominates-match-3-what-can-all-designers-learn/)
- [5 simple UX lessons from Royal Match (UserWise)](https://blog.userwise.io/blog/5-simple-ux-lessons-from-royal-match)
- [Royal Match (Dream Games)](https://dreamgames.com/games/royal-match)
- [Which match-3 game has the best graphics](https://info-casual-loop.pages.dev/post/which-match-3-game-has-the-best-graphics-we-ranked-them)
- [How match-3 levels work (G5 support)](https://support.g5.com/hc/en-us/articles/30309828473362-How-do-match-3-levels-work)
