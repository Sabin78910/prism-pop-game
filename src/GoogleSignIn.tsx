import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  googleAvailable,
  googleSignOut,
  nativeGoogleSignIn,
  readGoogleUser,
  renderGoogleButton,
  writeGoogleUser,
  type GoogleUser,
} from "./googleAuth";

interface Props {
  labels: { signIn: string; signedInAs: string; signOut: string; failed: string };
  onChange?: (user: GoogleUser | null) => void;
}

/** "Continue with Google" button, or the signed-in name with a sign out action. Hidden until a client id is configured. */
export function GoogleSignIn({ labels, onChange }: Props) {
  const [user, setUser] = useState<GoogleUser | null>(() => readGoogleUser());
  const [failed, setFailed] = useState(false);
  const slot = useRef<HTMLDivElement>(null);
  const native = Capacitor.isNativePlatform();

  const accept = (u: GoogleUser) => {
    writeGoogleUser(u);
    setUser(u);
    setFailed(false);
    onChange?.(u);
  };

  useEffect(() => {
    if (user || native || !googleAvailable() || !slot.current) return;
    renderGoogleButton(slot.current, accept).catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, native]);

  if (!googleAvailable()) return null;

  if (user) {
    return (
      <div className="google">
        <span>{labels.signedInAs.replace("{name}", user.name)}</span>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={async () => {
            await googleSignOut();
            setUser(null);
            onChange?.(null);
          }}
        >
          {labels.signOut}
        </button>
      </div>
    );
  }

  return (
    <div className="google">
      {native ? (
        <button
          type="button"
          className="btn"
          onClick={() =>
            nativeGoogleSignIn()
              .then((u) => (u ? accept(u) : setFailed(true)))
              .catch(() => setFailed(true))
          }
        >
          {labels.signIn}
        </button>
      ) : (
        <div ref={slot} />
      )}
      {failed && (
        <p role="alert" className="google__error">
          {labels.failed}
        </p>
      )}
    </div>
  );
}
