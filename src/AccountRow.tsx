import { useRef, useState } from "react";
import type { Account } from "./account";
import { t, type Lang } from "./i18n";
import { currentAccount, signIn, signInEnabled, signOut } from "./google";

/** Optional "Sign in with Google" row for Settings, profile only. Hidden unless a client ID is built in. */
export function AccountRow({ lang }: { lang: Lang }) {
  const [account, setAccount] = useState<Account | null>(currentAccount);
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const host = useRef<HTMLDivElement>(null);
  if (!signInEnabled()) return null;
  if (account)
    return (
      <div className="sync">
        <span>{t(lang, "signedInAs", { name: account.name })}</span>
        <button className="btn btn--ghost" onClick={() => void signOut().then(() => setAccount(null))}>
          {t(lang, "signOut")}
        </button>
      </div>
    );
  const start = () => {
    setState("busy");
    signIn(host.current!, lang)
      .then((a) => (setAccount(a), setState("idle")))
      .catch(() => setState("failed"));
  };
  return (
    <div className="sync">
      <button className="btn btn--ghost" disabled={state === "busy"} onClick={start}>
        {t(lang, "signIn")}
      </button>
      <div ref={host} />
      {state === "failed" && <span role="status">{t(lang, "signInFailed")}</span>}
    </div>
  );
}
