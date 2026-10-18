import { Capacitor } from "@capacitor/core";

/** Continue with Google: Google Identity Services on the web, the native account picker in the Android app. */
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_USER_KEY = "sabin-labs-google";

export interface GoogleUser {
  sub: string;
  name: string;
  picture?: string;
}

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const store = (): KV | undefined => (typeof localStorage !== "undefined" ? localStorage : undefined);

/** Reads the profile out of a Google ID token. The token is only decoded here; verifying it needs a server. */
export function parseIdToken(jwt: string): GoogleUser | null {
  try {
    const payload = jwt.split(".")[1];
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = new TextDecoder().decode(Uint8Array.from(atob(b64 + "===".slice((b64.length + 3) % 4)), (c) => c.charCodeAt(0)));
    const p = JSON.parse(json) as { sub?: string; name?: string; given_name?: string; picture?: string };
    if (!p.sub) return null;
    return { sub: p.sub, name: p.name ?? p.given_name ?? "", picture: p.picture };
  } catch {
    return null;
  }
}

export function readGoogleUser(s: KV | undefined = store()): GoogleUser | null {
  try {
    const raw = s?.getItem(GOOGLE_USER_KEY);
    const u = raw ? (JSON.parse(raw) as GoogleUser) : null;
    return u && typeof u.sub === "string" && typeof u.name === "string" ? u : null;
  } catch {
    return null;
  }
}

export function writeGoogleUser(user: GoogleUser | null, s: KV | undefined = store()): void {
  try {
    if (user) s?.setItem(GOOGLE_USER_KEY, JSON.stringify(user));
    else s?.removeItem(GOOGLE_USER_KEY);
  } catch {
    /* storage blocked: signed in for this session only */
  }
}

export const googleAvailable = (): boolean => GOOGLE_CLIENT_ID !== "";

interface GsiApi {
  accounts: {
    id: {
      initialize(o: { client_id: string; callback: (r: { credential: string }) => void }): void;
      renderButton(el: HTMLElement, o: Record<string, unknown>): void;
      disableAutoSelect(): void;
    };
  };
}

let gsi: Promise<GsiApi> | null = null;
function loadGsi(): Promise<GsiApi> {
  gsi ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve((window as unknown as { google: GsiApi }).google);
    s.onerror = () => {
      gsi = null;
      reject(new Error("Could not load Google sign-in"));
    };
    document.head.appendChild(s);
  });
  return gsi;
}

/** Renders Google's own button into `el` (web only). Calls `onUser` after a successful sign-in. */
export async function renderGoogleButton(el: HTMLElement, onUser: (u: GoogleUser) => void): Promise<void> {
  const g = await loadGsi();
  g.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: ({ credential }) => {
      const u = parseIdToken(credential);
      if (u) onUser(u);
    },
  });
  g.accounts.id.renderButton(el, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 280 });
}

/** Native Android account picker. The Google web WebView sign-in is blocked by Google, so the app uses a plugin. */
export async function nativeGoogleSignIn(): Promise<GoogleUser | null> {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  await SocialLogin.initialize({ google: { webClientId: GOOGLE_CLIENT_ID } });
  const res = await SocialLogin.login({ provider: "google", options: { scopes: ["profile"] } });
  const r = res.result as { idToken?: string | null };
  return r.idToken ? parseIdToken(r.idToken) : null;
}

export async function googleSignOut(): Promise<void> {
  writeGoogleUser(null);
  if (Capacitor.isNativePlatform()) {
    try {
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      await SocialLogin.logout({ provider: "google" });
    } catch {
      /* already signed out */
    }
  } else if (gsi) (await gsi).accounts.id.disableAutoSelect();
}
