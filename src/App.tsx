import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameCanvas } from "./GameCanvas";
import { sfx } from "./audio";
import { GEM_NAMES_EN, GEM_NAMES_NE, gemSprite } from "./game/gemArt";
import { hapticPattern, easeTowards } from "./game/feedback";
import { dailyKey, makeDailyLevel, makeLevel } from "./game/level";
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
  objectiveProgress,
  startSession,
  starsFor,
  swap,
  useBooster as applyBooster,
  type Booster,
  type Session,
} from "./game/session";
import type { Level, Pos } from "./game/types";
import { num, t, type Lang } from "./i18n";
import { useInstallPrompt } from "./install";

type Screen = "home" | "map" | "game";

interface Settings {
  sound: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  lang: Lang;
  onboarded: boolean;
}

const SETTINGS_KEY = "prism-pop-settings-v1";
const storage = typeof localStorage !== "undefined" ? localStorage : undefined;

function loadSettings(): Settings {
  const sysReduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const base: Settings = { sound: true, haptics: true, reduceMotion: sysReduce, lang: "en", onboarded: false };
  try {
    return { ...base, ...JSON.parse(storage?.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return base;
  }
}

function GemIcon({ color, size = 28 }: { color: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const px = size * 2;
    c.width = c.height = px;
    ctx.drawImage(gemSprite(color, "none", px), 0, 0);
  }, [color, size]);
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
  const [screen, setScreen] = useState<Screen>("home");
  const [session, setSession] = useState<Session | null>(null);
  const [, force] = useState(0);
  const [hammer, setHammer] = useState(false);
  const [shownScore, setShownScore] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<null | { won: boolean; stars: number; coins: number }>(null);
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

  const startLevel = useCallback((level: Level) => {
    setSession(startSession(level));
    setShownScore(0);
    setResult(null);
    setHammer(false);
    setScreen("game");
  }, []);

  const finish = useCallback(
    (s: Session) => {
      if (s.status === "won") {
        const stars = Math.max(1, starsFor(s.level, s.score));
        const coins = coinReward(stars, s.movesLeft);
        setProgress((p) =>
          s.level.number === 0 ? recordDaily(p, today, coins) : recordWin(p, s.level.number, stars, s.score, coins),
        );
        setResult({ won: true, stars, coins });
        sfx.win();
        if (settings.haptics && "vibrate" in navigator) navigator.vibrate(hapticPattern("win", true));
      } else if (s.status === "lost") {
        setResult({ won: false, stars: 0, coins: 0 });
        sfx.lose();
      }
    },
    [settings.haptics, today],
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
  const totalStars = useMemo(() => Object.values(progress.stars).reduce((a, b) => a + b, 0), [progress.stars]);

  const objectiveText = (lv: Level) => {
    const o = lv.objective;
    if (o.kind === "score") return t(lang, "goalScore", { n: o.target.toLocaleString("en-US") });
    if (o.kind === "collect") return t(lang, "goalCollect", { n: o.count, gem: (lang === "ne" ? GEM_NAMES_NE : GEM_NAMES_EN)[o.color] });
    return t(lang, "goalJelly", { n: o.count });
  };

  const settingsPanel = showSettings && (
    <div className="modal" role="dialog" aria-modal="true" aria-label={t(lang, "settings")}>
      <div className="sheet glass">
        <h2>{t(lang, "settings")}</h2>
        {(["sound", "haptics", "reduceMotion"] as const).map((k) => (
          <label key={k} className="toggle">
            <span>{t(lang, k === "sound" ? "sound" : k === "haptics" ? "vibration" : "motion")}</span>
            <input type="checkbox" checked={settings[k]} onChange={(e) => setSettings({ ...settings, [k]: e.target.checked })} />
          </label>
        ))}
        <div className="toggle">
          <span>{t(lang, "language")}</span>
          <div className="seg">
            {(["en", "ne"] as const).map((l) => (
              <button key={l} className={lang === l ? "on" : ""} onClick={() => setSettings({ ...settings, lang: l })}>
                {l === "en" ? "English" : "नेपाली"}
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn btn--ghost"
          onClick={() => {
            if (confirm(t(lang, "resetConfirm"))) setProgress(newProgress());
          }}
        >
          {t(lang, "reset")}
        </button>
        <a className="link" href="https://sabin78910.github.io/privacy-policy/" target="_blank" rel="noreferrer">
          {t(lang, "privacy")}
        </a>
        <button className="btn" onClick={() => setShowSettings(false)}>
          {t(lang, "close")}
        </button>
      </div>
    </div>
  );

  const onboarding = !settings.onboarded && (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="sheet glass onboard">
        {[1, 2, 3].map((i) => (
          <div key={i} className="onboard__card">
            <div className="onboard__icons">
              {i === 1 && [0, 0, 0].map((c, k) => <GemIcon key={k} color={c} size={34} />)}
              {i === 2 && [3, 3, 3, 3].map((c, k) => <GemIcon key={k} color={c} size={30} />)}
              {i === 3 && <span className="prism-dot" aria-hidden="true" />}
            </div>
            <h3>{t(lang, `howTitle${i}` as "howTitle1")}</h3>
            <p>{t(lang, `howBody${i}` as "howBody1")}</p>
          </div>
        ))}
        <button className="btn btn--big" onClick={() => setSettings({ ...settings, onboarded: true })}>
          {t(lang, "start")}
        </button>
      </div>
    </div>
  );

  const topBar = (
    <header className="topbar">
      <div className="pill" aria-label={t(lang, "coins")}>
        <span className="coin" aria-hidden="true" /> {num(lang, progress.coins)}
      </div>
      <div className="pill" aria-label="stars">
        <span className="star star--on">★</span> {num(lang, totalStars)}
      </div>
      <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label={t(lang, "settings")}>
        ⚙
      </button>
    </header>
  );

  if (screen === "home" || (!session && screen !== "map")) {
    return (
      <main className="app home">
        <div className="bg-gems" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${12 + (i % 5) * 3}s` }}>
              <GemIcon color={i % 6} size={22 + (i % 4) * 10} />
            </span>
          ))}
        </div>
        {topBar}
        <section className="hero">
          <h1 className="logo">
            Prism<span>Pop</span>
          </h1>
          <p className="tagline">{t(lang, "tagline")}</p>
          <button className="btn btn--play" onClick={() => startLevel(makeLevel(nextLevel))}>
            {t(lang, "play")} · {t(lang, "level")} {num(lang, nextLevel)}
          </button>
          <div className="cards">
            <button className="card glass" disabled={dailyDone} onClick={() => startLevel(makeDailyLevel(new Date()))}>
              <span className="card__flame" aria-hidden="true">🔥</span>
              <span className="card__title">{t(lang, "daily")}</span>
              <span className="card__sub">
                {dailyDone ? t(lang, "dailyDone") : `${num(lang, streak)} ${t(lang, "streak")}`}
              </span>
            </button>
            <button className="card glass" onClick={() => setScreen("map")}>
              <span className="card__flame" aria-hidden="true">🗺️</span>
              <span className="card__title">{t(lang, "map")}</span>
              <span className="card__sub">
                {num(lang, totalStars)} / {num(lang, (nextLevel - 1) * 3)} ★
              </span>
            </button>
          </div>
          {canInstall && (
            <button className="btn btn--ghost" onClick={install}>
              {t(lang, "install")}
            </button>
          )}
        </section>
        {onboarding}
        {settingsPanel}
      </main>
    );
  }

  if (screen === "map") {
    const max = nextLevel + 12;
    return (
      <main className="app map">
        {topBar}
        <button className="back" onClick={() => setScreen("home")}>
          ← {t(lang, "home")}
        </button>
        <ol className="path" aria-label={t(lang, "map")}>
          {Array.from({ length: max }, (_, i) => max - i).map((n) => {
            const locked = n > nextLevel;
            return (
              <li key={n} style={{ marginLeft: `${50 + Math.sin(n * 0.9) * 28}%` }}>
                <button
                  className={`node${locked ? " node--locked" : ""}${n === nextLevel ? " node--current" : ""}`}
                  disabled={locked}
                  onClick={() => startLevel(makeLevel(n))}
                  ref={n === nextLevel ? (el) => el?.scrollIntoView({ block: "center" }) : undefined}
                >
                  {locked ? "🔒" : num(lang, n)}
                </button>
                {!locked && <Stars n={progress.stars[n] ?? 0} />}
              </li>
            );
          })}
        </ol>
        {settingsPanel}
      </main>
    );
  }

  if (!session) return null;
  const lv = session.level;
  const prog = objectiveProgress(session);
  const maxStar = lv.stars[2];
  return (
    <main className="app game">
      <header className="hud glass">
        <button className="icon-btn" onClick={() => setScreen("home")} aria-label={t(lang, "home")}>
          ←
        </button>
        <div className="hud__goal">
          <div className="hud__label">{isDaily ? t(lang, "daily") : `${t(lang, "level")} ${num(lang, lv.number)}`}</div>
          <div className="hud__obj">
            {lv.objective.kind === "collect" && <GemIcon color={lv.objective.color} size={20} />}
            {objectiveText(lv)}
          </div>
          <div className="meter" role="progressbar" aria-valuenow={Math.round(prog * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="meter__fill" style={{ width: `${prog * 100}%` }} />
          </div>
        </div>
        <div className="hud__moves" aria-live="polite">
          <span className="hud__num">{num(lang, session.movesLeft)}</span>
          <span className="hud__label">{t(lang, "moves")}</span>
        </div>
      </header>
      <div className="scorebar" aria-label={t(lang, "score")}>
        <span className="scorebar__num">{num(lang, shownScore)}</span>
        <div className="scorebar__track">
          <div className="scorebar__fill" style={{ width: `${Math.min(100, (shownScore / maxStar) * 100)}%` }} />
          {lv.stars.map((s, i) => (
            <span key={i} className={`scorebar__star${shownScore >= s ? " on" : ""}`} style={{ left: `${(s / maxStar) * 100}%` }}>
              ★
            </span>
          ))}
        </div>
      </div>
      <div className="board-wrap">
        <GameCanvas
          key={`${lv.seed}-${lv.number}`}
          grid={session.grid}
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
      <nav className="boosters glass" aria-label="Boosters">
        {(["hammer", "shuffle", "moves"] as const).map((b) => (
          <button key={b} className={`booster${b === "hammer" && hammer ? " on" : ""}`} onClick={() => booster(b)}>
            <span className="booster__icon" aria-hidden="true">
              {b === "hammer" ? "🔨" : b === "shuffle" ? "🔀" : "➕"}
            </span>
            <span>{t(lang, b === "moves" ? "plusMoves" : b)}</span>
            <span className="booster__count">
              {progress.boosters[b] > 0 ? num(lang, progress.boosters[b]) : `${num(lang, BOOSTER_PRICE[b])}¢`}
            </span>
          </button>
        ))}
      </nav>
      {result && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className={`sheet glass result ${result.won ? "result--win" : ""}`}>
            {result.won && (
              <div className="confetti" aria-hidden="true">
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 8) * 0.08}s`, background: ["#FF4D6D", "#FFB703", "#2DD881", "#3A86FF", "#B15CFF", "#00D1FF"][i % 6] }} />
                ))}
              </div>
            )}
            <h2>{result.won ? t(lang, "win") : t(lang, "lose")}</h2>
            {result.won && <Stars n={result.stars} big />}
            <p className="result__score">
              {t(lang, "score")}: <strong>{num(lang, session.score)}</strong>
            </p>
            {session.bestCombo > 1 && (
              <p className="result__combo">
                {t(lang, "bestCombo")}: ×{num(lang, session.bestCombo + 1)}
              </p>
            )}
            {result.won && (
              <p className="result__coins">
                <span className="coin" aria-hidden="true" /> +{num(lang, result.coins)} {t(lang, "coins")}
              </p>
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
                <button className="btn btn--ghost" onClick={() => startLevel(lv.number === 0 ? makeDailyLevel(new Date()) : makeLevel(lv.number))}>
                  {t(lang, "retry")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {settingsPanel}
    </main>
  );
}
