import { useState } from "react";
import { t, type Lang } from "./i18n";
import type { SyncStatus } from "./useProgressSync";

interface Props {
  lang: Lang;
  code: string | null;
  status: SyncStatus;
  onTurnOn: () => void;
  onUseCode: (code: string) => boolean;
  onSyncNow: () => void;
  onTurnOff: () => void;
}

const STATUS_KEY = {
  off: "syncOff",
  syncing: "syncSyncing",
  synced: "syncSynced",
  offline: "syncOffline",
  error: "syncError",
} as const;

/** Settings section for end-to-end encrypted sync across devices. */
export function SyncPanel({ lang, code, status, onTurnOn, onUseCode, onSyncNow, onTurnOff }: Props) {
  const [paste, setPaste] = useState("");
  const [bad, setBad] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async (text: string, el: HTMLInputElement | null) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      el?.select();
    }
  };

  return (
    <section className="sync" aria-labelledby="sync-title">
      <div className="sync__head">
        <h3 id="sync-title">{t(lang, "syncTitle")}</h3>
        <span className={`sync__chip sync__chip--${status}`} role="status">
          {t(lang, STATUS_KEY[status])}
        </span>
      </div>
      <p className="sync__blurb">{t(lang, "syncBlurb")}</p>
      {code ? (
        <>
          <label className="sync__label" htmlFor="sync-code">
            {t(lang, "syncCodeLabel")}
          </label>
          <div className="sync__row">
            <input id="sync-code" className="sync__input" readOnly value={code} onFocus={(e) => e.target.select()} />
            <button
              className="btn"
              onClick={(e) => copy(code, (e.currentTarget.previousElementSibling as HTMLInputElement) ?? null)}
            >
              {copied ? t(lang, "syncCopied") : t(lang, "syncCopy")}
            </button>
          </div>
          <div className="sync__row">
            <button className="btn btn--ghost" onClick={onSyncNow}>
              {t(lang, "syncNow")}
            </button>
            <button className="btn btn--ghost" onClick={onTurnOff}>
              {t(lang, "syncTurnOff")}
            </button>
          </div>
        </>
      ) : (
        <>
          <button className="btn" onClick={onTurnOn}>
            {t(lang, "syncTurnOn")}
          </button>
          <form
            className="sync__row"
            onSubmit={(e) => {
              e.preventDefault();
              const ok = onUseCode(paste);
              setBad(!ok);
              if (ok) setPaste("");
            }}
          >
            <input
              id="sync-paste"
              className="sync__input"
              placeholder={t(lang, "syncUseCode")}
              aria-label={t(lang, "syncUseCode")}
              aria-invalid={bad}
              value={paste}
              onChange={(e) => {
                setPaste(e.target.value);
                setBad(false);
              }}
            />
            <button className="btn btn--ghost" type="submit" disabled={!paste.trim()}>
              {t(lang, "syncConnect")}
            </button>
          </form>
          {bad && (
            <p className="sync__error" role="alert">
              {t(lang, "syncBadCode")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
