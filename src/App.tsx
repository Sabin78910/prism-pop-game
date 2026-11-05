import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { GameCanvas } from "./GameCanvas";
import { Icon } from "./Icon";
import { sfx } from "./audio";
import { GEM_NAMES_EN, GEM_NAMES_NE, gemSprite } from "./game/gemArt";
import { claimableCount, claimMission, loadMissions, MISSION_GOAL, MISSION_IDS, MISSION_REWARD, missionDone, missionProgress, recordFinish, saveMissions } from "./game/missions";
import { earnedTrophies, TROPHY_IDS } from "./game/trophies";
import { easeTowards, hapticPattern, isNewBest, nearMissPercent, starsCrossed } from "./game/feedback";
import { activeTheme, BOARD_THEMES, THEME_IDS, themeUnlocked } from "./game/themes";
import { assistMoves, loadAssist, recordResult, saveAssist, withAssist } from "./game/assist";
import { dailyKey, makeDailyLevel, makeLevel } from "./game/level";
import { introFor, planFor, WORLD_IDS, WORLD_SIZE, WORLD_THEME, worldIndex, worldRange, worldStars, upNext, type Mechanic } from "./game/worlds";
import {
  BOOSTER_PRICE,
  buyBooster,
  liveStreak,
  loadProgress,
  newProgress,
  recordDaily,
  recordWin,
  saveProgress,
  spendBooster,
  type Progress,
} from "./game/progress";
import {
  coinReward,
  goalStatus,
  objectiveProgress,
  startSession,
  starsFor,
  swap,
  useBooster as applyBooster,
  type Booster,
  type Session,
} from "./game/session";
import type { Level, Pos, Special } from "./game/types";
import { num, t, type Lang } from "./i18n";
import { useInstallPrompt } from "./install";
import { Confirm, Ribbon, Sheet, Toggle } from "./Kit";
import { CountUp, useCoinFlight } from "./Motion";
import { Scenery } from "./Scenery";
import { walletDelay, coinFlightCount } from "./game/countUp";
import { SyncPanel } from "./SyncPanel";
import { AccountRow } from "./AccountRow";
import { loadStreak, nextStreak, saveStreak, streakBonus } from "./game/streak";
import { levelGain, rankFor, rankPoints, TIER_COLORS, type Rank } from "./game/ranks";
import { useProgressSync } from "./useProgressSync";

type Screen = "home" | "map" | "game";

interface Settings {
  sound: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  /** Fair assist: a few extra moves after repeated losses on one level. */
  assist: boolean;
  /** Chosen board theme; drawn only once earned. */
  theme: string;
  lang: Lang;
  onboarded: boolean;
}

const SETTINGS_KEY = "prism-pop-settings-v1";
const storage = typeof localStorage !== "undefined" ? localStorage : undefined;

function loadSettings(): Settings {
  const sysReduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const base: Settings = { sound: true, haptics: true, reduceMotion: sysReduce, assist: true, theme: "classic", lang: "en", onboarded: false };
  try {
    return { ...base, ...JSON.parse(storage?.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return base;
  }
}

function GemIcon({ color, size = 28, special = "none" }: { color: number; size?: number; special?: Special }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const px = size * 2;
    c.width = c.height = px;
    ctx.drawImage(gemSprite(color, special, px), 0, 0);
  }, [color, size, special]);
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}

function Stars({ n, big = false }: { n: number; big?: boolean }) {
  return (
    <span className={`stars${big ? " stars--big" : ""}`} aria-label={`${n} / 3`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < n ? "star star--on" : "star"} style={{ animationDelay: `${i * 0.25}s` }}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [progress, setProgress] = useState<Progress>(() => loadProgress(storage));
  const [missions, setMissions] = useState(() => loadMissions(storage, dailyKey(new Date())));
  const [screen, setScreen] = useState<Screen>("home");
  const [session, setSession] = useState<Session | null>(null);
  const [, force] = useState(0);
  const [hammer, setHammer] = useState(false);
  const [shownScore, setShownScore] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<null | { won: boolean; stars: number; coins: number; newBest: boolean; nearMiss: number | null; rp: number; rankUp: Rank | null; streak: number; bonus: number }>(null);
  const [starFlash, setStarFlash] = useState<number | null>(null);
  const [intro, setIntro] = useState<Mechanic | null>(null);
  const [preview, setPreview] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [assistLog, setAssistLog] = useState(() => loadAssist(storage));
  const [assistExtra, setAssistExtra] = useState(0);
  const [winStreak, setWinStreak] = useState(() => loadStreak(storage));
  const prevShown = useRef(0);
  const rewardRef = useRef<HTMLSpanElement>(null);
  const coinFlight = useCoinFlight(settings.reduceMotion);
  const { fly } = coinFlight;
  useEffect(() => {
    if (result?.won) fly(rewardRef.current, result.coins);
  }, [result, fly]);
  const { canInstall, install } = useInstallPrompt();
  const lang = settings.lang;
  const today = dailyKey(new Date());
  const isDaily = session?.level.number === 0;

  useEffect(() => {
    sfx.enabled = settings.sound;
    try {
      storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    document.documentElement.lang = settings.lang;
    document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings]);

  useEffect(() => saveProgress(storage, progress), [progress]);
  useEffect(() => saveMissions(storage, missions), [missions]);
  useEffect(() => saveAssist(storage, assistLog), [assistLog]);
  useEffect(() => saveStreak(storage, winStreak), [winStreak]);
  const sync = useProgressSync(progress, setProgress);

  // Score counts up smoothly instead of jumping.
  useEffect(() => {
    if (!session) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setShownScore((s) => easeTowards(s, session.score, now - last));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [session]);

  // A star lighting up mid-level gets its own chime and buzz: progress you can hear and feel.
  useEffect(() => {
    const prev = prevShown.current;
    prevShown.current = shownScore;
    if (!session || shownScore < prev) return;
    const crossed = starsCrossed(prev, shownScore, session.level.stars);
    if (!crossed.length) return;
    const i = crossed[crossed.length - 1];
    sfx.star(i);
    if (settings.haptics && "vibrate" in navigator) navigator.vibrate(hapticPattern("star", true));
    setStarFlash(i);
    const id = setTimeout(() => setStarFlash(null), 700);
    return () => clearTimeout(id);
  }, [shownScore, session, settings.haptics]);

  const startLevel = useCallback((base: Level) => {
    const { level, extra } = withAssist(base, assistLog, settings.assist);
    setAssistExtra(extra);
    setSession(startSession(level));
    setShownScore(0);
    prevShown.current = 0;
    setResult(null);
    setHammer(false);
    setIntro(level.number > 0 ? introFor(level.number) : null);
    setPreview(true);
    setScreen("game");
  }, [assistLog, settings.assist]);

  const finish = useCallback(
    (s: Session) => {
      if (s.status === "won" || s.status === "lost") setAssistLog((log) => recordResult(log, s.level.number, s.status === "won"));
      const onMap = s.level.number > 0;
      const streak = onMap ? nextStreak(winStreak, s.status === "won") : winStreak;
      if (onMap && (s.status === "won" || s.status === "lost")) setWinStreak(streak);
      if (s.status === "won") {
        const stars = Math.max(1, starsFor(s.level, s.score));
        const bonus = onMap ? streakBonus(streak) : 0;
        const coins = coinReward(stars, s.movesLeft) + bonus;
        setProgress((p) =>
          s.level.number === 0 ? recordDaily(p, today, coins) : recordWin(p, s.level.number, stars, s.score, coins),
        );
        setMissions((m) => recordFinish(m, today, { won: true, daily: s.level.number === 0, bestCombo: s.bestCombo }));
        const newBest = s.level.number > 0 && isNewBest(progress.best[s.level.number], s.score);
        const before = s.level.number > 0 ? (progress.stars[s.level.number] ?? 0) : 3;
        const rp = levelGain(before, stars);
        const from = rankFor(rankPoints(progress.stars));
        const to = rankFor(from.points + rp);
        setResult({ won: true, stars, coins, newBest, nearMiss: null, rp, rankUp: to.step > from.step ? to : null, streak, bonus });
        sfx.win();
        if (newBest || to.step > from.step) sfx.record();
        if (settings.haptics && "vibrate" in navigator) navigator.vibrate(hapticPattern("win", true));
      } else if (s.status === "lost") {
        setResult({ won: false, stars: 0, coins: 0, newBest: false, nearMiss: nearMissPercent(objectiveProgress(s)), rp: 0, rankUp: null, streak: 0, bonus: 0 });
        sfx.lose();
      }
    },
    [settings.haptics, today, progress.best, progress.stars, winStreak],
  );

  const onSettled = useCallback(() => {
    if (session) {
      force((n) => n + 1);
      finish(session);
    }
  }, [session, finish]);

  const onSwap = useCallback(
    (a: Pos, b: Pos) => {
      const res = swap(session!, a, b);
      force((n) => n + 1);
      return res;
    },
    [session],
  );

  const onHammer = useCallback(
    (p: Pos) => {
      const next = spendBooster(progress, "hammer");
      if (!next) return { valid: false, steps: [], shuffled: false };
      const res = applyBooster(session!, "hammer", p);
      if (res.valid) setProgress(next);
      setHammer(false);
      return res;
    },
    [progress, session],
  );

  const booster = (b: Booster) => {
    if (!session) return;
    let p: Progress | null = progress;
    if (p.boosters[b] <= 0) p = buyBooster(p, b);
    if (!p) return;
    if (b === "hammer") {
      setProgress(p);
      setHammer((h) => !h);
      return;
    }
    const next = spendBooster(p, b);
    if (!next) return;
    const res = applyBooster(session, b);
    if (res.valid) {
      setProgress(next);
      if (b === "moves") setResult(null);
      sfx.special();
      force((n) => n + 1);
    }
  };

  const nextLevel = progress.unlocked;
  const streak = liveStreak(progress, today);
  const dailyDone = progress.daily.lastDone === today;
  const rank = useMemo(() => rankFor(rankPoints(progress.stars)), [progress.stars]);
  const rankName = (r: Rank) => `${t(lang, `tier_${r.tier}`)}${r.division ? ` ${r.division}` : ""}`;
  const totalStars = useMemo(() => Object.values(progress.stars).reduce((a, b) => a + b, 0), [progress.stars]);

  const world = WORLD_IDS[worldIndex(screen === "game" && session && session.level.number > 0 ? session.level.number : nextLevel)];
  const gemName = (c: number) => (lang === "ne" ? GEM_NAMES_NE : GEM_NAMES_EN)[c];
  const claimable = claimableCount(missions);

  const objectiveText = (lv: Level) => {
    const o = lv.objective;
    if (o.kind === "score") return t(lang, "goalScore", { n: o.target.toLocaleString("en-US") });
    if (o.kind === "collect") return t(lang, "goalCollect", { n: o.count, gem: gemName(o.color) });
    if (o.kind === "ice") return t(lang, "goalIce", { n: o.count });
    return t(lang, "goalJelly", { n: o.count });
  };

  /** Goal tile: an icon with the count still needed, or a check once done. */
  const goalTile = (s: Session, big = false) => {
    const g = goalStatus(s);
    const size = big ? 40 : 30;
    const icon =
      g.kind === "collect" ? (
        <GemIcon color={g.color!} size={size} />
      ) : g.kind === "score" ? (
        <span className="star-badge" style={{ fontSize: size }}>★</span>
      ) : (
        <span className={`goal-icon goal-icon--${g.kind}`} style={{ width: size, height: size }} />
      );
    const label = t(lang, `goalLabel_${g.kind}`, { n: num(lang, g.left), gem: g.color !== undefined ? gemName(g.color) : "" });
    return (
      <div className={`goal${g.kind === "score" ? " goal--wide" : ""}`} role="img" aria-label={label} key={`${g.kind}-${g.done}`}>
        {icon}
        {g.done ? (
          <span className="goal__done">
            <Icon name="check" size={16} />
          </span>
        ) : (
          <span className="goal__count">{num(lang, g.kind === "score" ? g.total : g.left)}</span>
        )}
      </div>
    );
  };

  const topBar = (
    <header className="topbar">
      <div className="pill" aria-label={`${t(lang, "coins")}: ${progress.coins}`}>
        <span className="pill__icon">
          <span className="coin" />
        </span>
        <span className="pill__value" data-coin-target>
          <CountUp value={progress.coins} lang={lang} reduce={settings.reduceMotion} />
        </span>
      </div>
      <div className="pill" aria-label={`★ ${totalStars}`}>
        <span className="pill__icon star-badge">★</span>
        <span className="pill__value">{num(lang, totalStars)}</span>
      </div>
      <span className="spacer" />
      <button className="btn btn--ghost round" onClick={() => setShowSettings(true)} aria-label={t(lang, "settings")}>
        <Icon name="gear" size={24} />
      </button>
    </header>
  );

  const tabs = (
    <nav className="tabs panel" aria-label="Main">
      <button className={`tab${screen === "map" ? " tab--on" : ""}`} onClick={() => setScreen("map")} aria-current={screen === "map" ? "page" : undefined}>
        <Icon name="map" />
        {t(lang, "map")}
      </button>
      <button className={`tab${screen === "home" ? " tab--on" : ""}`} onClick={() => setScreen("home")} aria-current={screen === "home" ? "page" : undefined}>
        <Icon name="home" />
        {t(lang, "home")}
      </button>
      <button className="tab" onClick={() => setShowGoals(true)}>
        <Icon name="trophy" />
        {t(lang, "goals")}
        {claimable > 0 && <span className="badge">{num(lang, claimable)}</span>}
      </button>
    </nav>
  );

  const settingsPanel = showSettings && (
    <Sheet title={t(lang, "settings")} onClose={() => setShowSettings(false)} labelledBy="settings-title">
      <Toggle label={t(lang, "sound")} checked={settings.sound} onChange={(v) => setSettings({ ...settings, sound: v })} />
      <Toggle label={t(lang, "vibration")} checked={settings.haptics} onChange={(v) => setSettings({ ...settings, haptics: v })} />
      <Toggle label={t(lang, "motion")} checked={settings.reduceMotion} onChange={(v) => setSettings({ ...settings, reduceMotion: v })} />
      <Toggle label={t(lang, "assist")} checked={settings.assist} onChange={(v) => setSettings({ ...settings, assist: v })} />
      <div className="row">
        <span>{t(lang, "language")}</span>
        <div className="seg">
          {(["en", "ne"] as const).map((l) => (
            <button key={l} className={lang === l ? "on" : ""} onClick={() => setSettings({ ...settings, lang: l })}>
              {l === "en" ? "English" : "नेपाली"}
            </button>
          ))}
        </div>
      </div>
      <h3>{t(lang, "boardTheme")}</h3>
      <div className="themes__row" role="radiogroup" aria-label={t(lang, "boardTheme")}>
        {THEME_IDS.map((id) => {
          const open = themeUnlocked(id, progress.unlocked);
          const on = activeTheme(settings.theme, progress.unlocked) === id;
          const name = id === "classic" ? t(lang, "themeClassic") : t(lang, `world_${id}`);
          return (
            <button
              key={id}
              role="radio"
              aria-checked={on}
              disabled={!open}
              className={`swatch${on ? " swatch--on" : ""}`}
              style={{ "--swatch": BOARD_THEMES[id].swatch } as CSSProperties}
              aria-label={open ? name : `${name}: ${t(lang, "themeLocked", { world: name })}`}
              title={open ? name : t(lang, "themeLocked", { world: name })}
              onClick={() => setSettings({ ...settings, theme: id })}
            >
              {!open && <Icon name="lock" size={18} />}
            </button>
          );
        })}
      </div>
      <AccountRow lang={lang} />
      <SyncPanel
        lang={lang}
        code={sync.code}
        status={sync.status}
        onTurnOn={sync.turnOn}
        onUseCode={sync.useCode}
        onSyncNow={() => void sync.syncNow()}
        onTurnOff={sync.turnOff}
      />
      {canInstall && (
        <button className="btn btn--blue" onClick={install}>
          {t(lang, "install")}
        </button>
      )}
      <button className="btn btn--ghost" onClick={() => setConfirmReset(true)}>
        {t(lang, "reset")}
      </button>
      <a className="link" href="https://sabin78910.github.io/privacy-policy/" target="_blank" rel="noreferrer">
        {t(lang, "privacy")}
      </a>
      <button className="btn" onClick={() => setShowSettings(false)}>
        {t(lang, "close")}
      </button>
    </Sheet>
  );

  const resetConfirm = confirmReset && (
    <Confirm
      text={t(lang, "resetConfirm")}
      yes={t(lang, "erase")}
      no={t(lang, "cancel")}
      onNo={() => setConfirmReset(false)}
      onYes={() => {
        setProgress(newProgress());
        setConfirmReset(false);
      }}
    />
  );

  const earned = earnedTrophies(progress);
  const goalsPanel = showGoals && (
    <Sheet title={t(lang, "goals")} tone="gold" onClose={() => setShowGoals(false)}>
      <h3>{t(lang, "missions")}</h3>
      {MISSION_IDS.map((id) => {
        const done = missionDone(missions, id);
        const p = missionProgress(missions, id);
        return (
          <div key={id} className="mission">
            <div style={{ flex: 1 }}>
              {t(lang, `mission_${id}`)}
              <div className="mission__bar" aria-label={`${p}/${MISSION_GOAL[id]}`}>
                <i style={{ width: `${(p / MISSION_GOAL[id]) * 100}%` }} />
              </div>
            </div>
            <button
              className={`btn btn--small${done && !missions.claimed[id] ? " btn--gold" : " btn--ghost"}`}
              disabled={!done || missions.claimed[id]}
              onClick={(e) => {
                const r = claimMission(missions, id);
                fly(e.currentTarget, r.coins);
                if (r.coins === 0) return;
                setMissions(r.missions);
                setProgress((pr) => ({ ...pr, coins: pr.coins + r.coins, updatedAt: Date.now() }));
                sfx.coin();
              }}
            >
              {missions.claimed[id] ? <Icon name="check" size={18} label="✓" /> : `+${num(lang, MISSION_REWARD[id])}`}
            </button>
          </div>
        );
      })}
      <h3>
        {t(lang, "trophies")} {num(lang, TROPHY_IDS.filter((id) => earned[id]).length)}/{num(lang, TROPHY_IDS.length)}
      </h3>
      <div className="trophies">
        <ul>
          {TROPHY_IDS.map((id) => (
            <li key={id} className={earned[id] ? "on" : ""}>
              <Icon name={earned[id] ? "trophy" : "lock"} size={18} /> {t(lang, `trophy_${id}`)}
            </li>
          ))}
        </ul>
      </div>
      <button className="btn" onClick={() => setShowGoals(false)}>
        {t(lang, "close")}
      </button>
    </Sheet>
  );

  const onboarding = !settings.onboarded && (
    <Sheet title={t(lang, "start")} tone="gold">
      {[1, 2, 3].map((i) => (
        <div key={i} className="learn">
          <h3>{t(lang, `howTitle${i}` as "howTitle1")}</h3>
          <p>{t(lang, `howBody${i}` as "howBody1")}</p>
        </div>
      ))}
      <button className="btn btn--big" onClick={() => setSettings({ ...settings, onboarded: true })}>
        {t(lang, "play")}
      </button>
    </Sheet>
  );

  const overlays = (
    <>
      {onboarding}
      {goalsPanel}
      {settingsPanel}
      {resetConfirm}
      {coinFlight.layer}
    </>
  );

  if (screen === "home" || (!session && screen !== "map")) {
    const ws = worldStars(progress.stars, worldIndex(nextLevel));
    return (
      <>
        <Scenery world={world} />
        <main className="app home" style={{ "--accent": WORLD_THEME[world].accent } as CSSProperties}>
          {topBar}
          <section className="home__brand">
            <h1 className="logo">
              Prism <span>Pop</span>
            </h1>
            <p className="home__tag">{t(lang, "tagline")}</p>
          </section>
          <div className="hero-gems" aria-hidden="true">
            {[0, 3, -1, 2, 4].map((c, i) => (
              <span key={i} style={{ animationDelay: `${i * -0.7}s` }}>
                <GemIcon color={c} special={c < 0 ? "prism" : "none"} size={c < 0 ? 104 : 62} />
              </span>
            ))}
          </div>
          <section className="home__stage">
            <div className="world-card panel">
              <span className="world-card__name display">{t(lang, `world_${world}`)}</span>
              <span className="world-card__sub">{t(lang, `worldBlurb_${world}`)}</span>
              <span className="world-card__stars display">
                <span className="star-badge" style={{ fontSize: 22 }}>★</span> {num(lang, ws.got)}/{num(lang, ws.max)}
              </span>
              <div className="bar" aria-hidden="true">
                <div className="bar__fill" style={{ width: `${(ws.got / ws.max) * 100}%` }} />
              </div>
            </div>
            <div className="rank-card panel" style={{ "--tier": TIER_COLORS[rank.tier] } as React.CSSProperties}>
              <span className="rank-card__badge" aria-hidden="true">
                <Icon name="trophy" />
              </span>
              <span className="rank-card__name display">{rankName(rank)}</span>
              <span className="rank-card__sub">
                {rank.toNext > 0 ? t(lang, "rankToNext", { n: num(lang, rank.toNext) }) : t(lang, "rankTop")}
              </span>
              <div className="bar" role="img" aria-label={`${t(lang, "rank")}: ${rankName(rank)}`}>
                <div className="bar__fill" style={{ width: `${rank.fill * 100}%` }} />
              </div>
            </div>
            <button className="btn btn--play" onClick={() => startLevel(makeLevel(nextLevel))}>
              {t(lang, "play")}
              <small>{t(lang, "playLevel", { n: num(lang, nextLevel) })}</small>
            </button>
            <div className="quick">
              <button className="btn btn--gold tile-btn" disabled={dailyDone} onClick={() => startLevel(makeDailyLevel(new Date()))}>
                <Icon name="flame" />
                <span>
                  {t(lang, "daily")}
                  <small>{dailyDone ? t(lang, "dailyDone") : `${num(lang, streak)} ${t(lang, "streak")}`}</small>
                </span>
              </button>
              <button className="btn btn--blue tile-btn" onClick={() => setScreen("map")}>
                <Icon name="map" />
                <span>
                  {t(lang, "map")}
                  <small>
                    ★ {num(lang, totalStars)}/{num(lang, (nextLevel - 1) * 3)}
                  </small>
                </span>
              </button>
            </div>
          </section>
          {tabs}
        </main>
        {overlays}
      </>
    );
  }

  if (screen === "map") {
    const current = worldIndex(nextLevel);
    const shown = Math.min(WORLD_IDS.length - 1, current + 1);
    return (
      <>
        <Scenery world={world} />
        <main className="app map">
          {topBar}
          {Array.from({ length: shown + 1 }, (_, w) => {
            const id = WORLD_IDS[w];
            const { first, last } = worldRange(w);
            const locked = first > nextLevel;
            const end = Math.min(last, Math.max(first + WORLD_SIZE - 1, nextLevel + 6));
            const ws = worldStars(progress.stars, w);
            const count = end - first + 1;
            const xs = Array.from({ length: count }, (_, i) => 50 + Math.sin((first + i) * 0.9) * 28);
            return (
              <section
                key={id}
                className={`chapter panel${locked ? " chapter--locked" : ""}`}
                style={{ "--accent": WORLD_THEME[id].accent } as CSSProperties}
                aria-label={t(lang, `world_${id}`)}
              >
                <Ribbon>{t(lang, `world_${id}`)}</Ribbon>
                <div className="chapter__meta">
                  <span>{locked ? t(lang, "worldLocked", { n: num(lang, first) }) : t(lang, `worldBlurb_${id}`)}</span>
                  {!locked && (
                    <span className="chapter__stars">
                      ★ {num(lang, ws.got)}/{num(lang, ws.max)}
                    </span>
                  )}
                </div>
                {!locked && (
                  <div className="road">
                    <svg className="road__line" viewBox={`0 0 100 ${count * 96}`} preserveAspectRatio="none" aria-hidden="true">
                      <polyline
                        points={xs.map((x, i) => `${x},${i * 96 + 48}`).join(" ")}
                        fill="none"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="2 18"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    <ol>
                      {Array.from({ length: count }, (_, i) => first + i).map((n, i) => {
                        const lockedNode = n > nextLevel;
                        const boss = planFor(n).stage === "boss";
                        return (
                          <li key={n} style={{ marginLeft: `${xs[i]}%` }}>
                            <button
                              className={`node${lockedNode ? " node--locked" : ""}${n === nextLevel ? " node--current" : ""}${boss ? " node--boss" : ""}`}
                              disabled={lockedNode}
                              aria-label={`${t(lang, "level")} ${n}${boss ? `, ${t(lang, "boss")}` : ""}`}
                              onClick={() => startLevel(makeLevel(n))}
                              ref={n === nextLevel ? (el) => el?.scrollIntoView({ block: "center" }) : undefined}
                            >
                              {lockedNode ? <Icon name="lock" size={22} /> : num(lang, n)}
                            </button>
                            {!lockedNode && n !== nextLevel && <Stars n={progress.stars[n] ?? 0} />}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </section>
            );
          })}
          {tabs}
        </main>
        {overlays}
      </>
    );
  }

  if (!session) return null;
  const lv = session.level;
  const maxStar = lv.stars[2];
  const levelName = isDaily ? t(lang, "daily") : `${t(lang, `world_${WORLD_IDS[worldIndex(lv.number)]}`)} · ${num(lang, lv.number)}`;
  return (
    <>
      <Scenery world={world} />
      {coinFlight.layer}
      <main className="app game" style={{ "--accent": WORLD_THEME[isDaily ? "spire" : world].accent } as CSSProperties}>
        <header className="hud panel">
          <button className="btn btn--ghost round" onClick={() => setScreen("home")} aria-label={t(lang, "home")}>
            <Icon name="back" size={24} />
          </button>
          <div className="hud__mid">
            <div className="hud__label">
              {levelName}
              {!isDaily && planFor(lv.number).stage === "boss" && ` · ${t(lang, "boss")}`}
            </div>
            <div className="goals" aria-live="polite">
              {goalTile(session)}
            </div>
          </div>
          <div className={`hud__moves${session.movesLeft <= 5 && session.status === "playing" ? " hud__moves--low" : ""}`} aria-live="polite">
            <span className="hud__num">{num(lang, session.movesLeft)}</span>
            <span className="hud__label">{t(lang, "moves")}</span>
            {assistExtra > 0 && (
              <span className="hud__assist" title={t(lang, "assistWhy")}>
                {t(lang, "assistChip", { n: assistExtra })}
              </span>
            )}
          </div>
        </header>
        <div className="score" aria-label={t(lang, "score")}>
          <span className="score__num">{num(lang, shownScore)}</span>
          <div className="score__track">
            <div className="score__fill" style={{ width: `${Math.min(100, (shownScore / maxStar) * 100)}%` }} />
            {lv.stars.map((s, i) => (
              <span key={i} className={`score__star${shownScore >= s ? " on" : ""}${starFlash === i ? " flash" : ""}`} style={{ left: `${(s / maxStar) * 100}%` }}>
                ★
              </span>
            ))}
          </div>
        </div>
        <div className="board-wrap">
          <GameCanvas
            key={`${lv.seed}-${lv.number}`}
            grid={session.grid}
            tiles={BOARD_THEMES[activeTheme(settings.theme, progress.unlocked)].tiles}
            getGrid={() => session.grid}
            jelly={session.ctx.jelly}
            lang={lang}
            reducedMotion={settings.reduceMotion}
            haptics={settings.haptics}
            hammer={hammer}
            onSwap={onSwap}
            onHammer={onHammer}
            onSettled={onSettled}
          />
          {hammer && <div className="toast">{t(lang, "hammerHint")}</div>}
        </div>
        <nav className="boosters panel" aria-label="Boosters">
          {(["hammer", "shuffle", "moves"] as const).map((b) => (
            <button
              key={b}
              className={`booster${b === "hammer" && hammer ? " on" : ""}`}
              onClick={() => booster(b)}
              aria-label={`${t(lang, b === "moves" ? "plusMoves" : b)}: ${progress.boosters[b] > 0 ? progress.boosters[b] : `${BOOSTER_PRICE[b]} ${t(lang, "coins")}`}`}
            >
              <Icon name={b === "hammer" ? "hammer" : b === "shuffle" ? "shuffle" : "plus"} />
              <span className={`booster__count${progress.boosters[b] > 0 ? "" : " booster__count--buy"}`}>
                {progress.boosters[b] > 0 ? num(lang, progress.boosters[b]) : `${num(lang, BOOSTER_PRICE[b])}¢`}
              </span>
            </button>
          ))}
        </nav>
        {preview && !result && (
          <Sheet title={isDaily ? t(lang, "daily") : t(lang, "playLevel", { n: num(lang, lv.number) })} labelledBy="preview">
            {!isDaily && planFor(lv.number).stage === "boss" && <span className="chip">{t(lang, "boss")}</span>}
            <p id="preview">{objectiveText(lv)}</p>
            <div className="goal-preview">{goalTile(session, true)}</div>
            {intro && (
              <div className="learn">
                <span className="chip chip--new">{t(lang, "newThing")}</span>
                <h3>{t(lang, `intro_${intro}`)}</h3>
                <p>{t(lang, `introBody_${intro}`)}</p>
              </div>
            )}
            {assistExtra > 0 && <p>{t(lang, "assistWhy")}</p>}
            <button className="btn btn--big" autoFocus onClick={() => setPreview(false)}>
              {t(lang, "play")}
            </button>
          </Sheet>
        )}
        {result && (
          <Sheet title={result.won ? t(lang, "win") : t(lang, "lose")} tone={result.won ? "gold" : "pink"} className={result.won ? "result--win" : ""}>
            {result.won && (
              <div className="confetti" aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 8) * 0.08}s`, background: ["#FF4D6D", "#FFB703", "#2DD881", "#3A86FF", "#B15CFF", "#00D1FF"][i % 6] }} />
                ))}
              </div>
            )}
            <div className="result-stars" aria-label={`${result.stars} / 3`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={`result-star${i < result.stars ? " on" : ""}`} style={{ animationDelay: `${0.25 + i * 0.25}s` }}>
                  ★
                </span>
              ))}
            </div>
            <p className="result__score">
              <CountUp value={session.score} from={0} delay={250} lang={lang} reduce={settings.reduceMotion} />
            </p>
            {result.rp > 0 && <p className="result__rank">{t(lang, "rankGain", { n: num(lang, result.rp) })}</p>}
            {result.rankUp && (
              <p className="result__rankup display" role="status" style={{ "--tier": TIER_COLORS[result.rankUp.tier] } as React.CSSProperties}>
                {t(lang, "rankUp", { rank: rankName(result.rankUp) })}
              </p>
            )}
            {result.bonus > 0 && (
              <p className="result__streak">
                <Icon name="flame" size={18} /> {t(lang, "winStreak", { n: num(lang, result.streak), c: num(lang, result.bonus) })}
              </p>
            )}
            {result.newBest && <p className="result__best">{t(lang, "newBest")}</p>}
            {result.nearMiss !== null && <p>{t(lang, "soClose", { n: result.nearMiss })}</p>}
            {!result.won && settings.assist && !isDaily && assistMoves(assistLog[lv.number] ?? 0) > assistExtra && (
              <p>{t(lang, "assistNext", { n: assistMoves(assistLog[lv.number] ?? 0) })}</p>
            )}
            {result.won && !isDaily && <UpNextLine lang={lang} won={lv.number} />}
            {session.bestCombo > 1 && (
              <p className="result__line">
                {t(lang, "bestCombo")}: ×{num(lang, session.bestCombo + 1)}
              </p>
            )}
            {result.won && (
              <>
                <span className="reward" ref={rewardRef}>
                  <span className="coin" /> +{num(lang, result.coins)}
                </span>
                <span className="pill wallet" aria-label={`${t(lang, "coins")}: ${progress.coins}`}>
                  <span className="pill__icon">
                    <span className="coin" />
                  </span>
                  <span className="pill__value" data-coin-target>
                    <CountUp
                      value={progress.coins}
                      from={progress.coins - result.coins}
                      delay={walletDelay(coinFlightCount(result.coins))}
                      lang={lang}
                      reduce={settings.reduceMotion}
                    />
                  </span>
                </span>
              </>
            )}
            {result.won ? (
              <>
                {!isDaily && (
                  <button className="btn btn--big" onClick={() => startLevel(makeLevel(lv.number + 1))}>
                    {t(lang, "next")}
                  </button>
                )}
                <button className="btn btn--ghost" onClick={() => setScreen("home")}>
                  {t(lang, "home")}
                </button>
              </>
            ) : (
              <>
                <button className="btn btn--big" onClick={() => booster("moves")}>
                  {t(lang, "keepGoing")}{" "}
                  {progress.boosters.moves > 0 ? `(${num(lang, progress.boosters.moves)})` : `· ${num(lang, BOOSTER_PRICE.moves)}¢`}
                </button>
                <button className="btn btn--blue" onClick={() => startLevel(lv.number === 0 ? makeDailyLevel(new Date()) : makeLevel(lv.number))}>
                  {t(lang, "retry")}
                </button>
                <button className="btn btn--ghost" onClick={() => setScreen("home")}>
                  {t(lang, "home")}
                </button>
              </>
            )}
          </Sheet>
        )}
        {settingsPanel}
      </main>
    </>
  );
}

/** Foreshadows what is coming after a win: the boss, a new world, or the distance to the boss. */
function UpNextLine({ lang, won }: { lang: Lang; won: number }) {
  const u = upNext(won);
  const world = t(lang, `world_${u.world}`);
  const text = u.kind === "boss" ? t(lang, "nextBoss", { world }) : u.kind === "world" ? t(lang, "nextWorld", { world }) : t(lang, "toBoss", { world, n: num(lang, u.left) });
  return (
    <p className={`result__next result__next--${u.kind}`} style={{ "--world": WORLD_THEME[u.world].accent } as CSSProperties}>
      {text}
    </p>
  );
}
