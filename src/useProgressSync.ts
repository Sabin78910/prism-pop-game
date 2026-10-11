import { useCallback, useEffect, useRef, useState } from "react";
import { mergeProgress, type Progress } from "./game/progress";
import { newSyncCode, parseSyncCode, SyncClient, type PushResult } from "./sync";

export type SyncStatus = "off" | "syncing" | "synced" | "offline" | "error";

/** The part of SyncClient that syncing needs, so tests can use a fake. */
export interface SyncTransport {
  pull<T>(): Promise<{ version: number; value: T } | null>;
  push(value: unknown, baseVersion: number): Promise<PushResult>;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * One sync round: pull, merge, and push only when the merge adds something the server lacks.
 * Retries on a version conflict. Returns the merged progress and whether local progress changed.
 */
export async function syncOnce(
  client: SyncTransport,
  local: Progress,
): Promise<{ merged: Progress; changedLocal: boolean; pushed: boolean }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const remote = await client.pull<Progress>();
    const merged = remote ? mergeProgress(local, remote.value) : local;
    const changedLocal = !same(merged, local);
    if (remote && same(merged, remote.value)) return { merged, changedLocal, pushed: false };
    const res = await client.push(merged, remote?.version ?? 0);
    if (res.ok) return { merged, changedLocal, pushed: true };
    if (!res.conflict) throw new Error(res.error);
    local = merged;
  }
  throw new Error("Sync kept conflicting");
}

/** Shared by every Sabin Labs web app on this origin: sign in once on the hub, synced everywhere. */
export const SHARED_CODE_KEY = "sabin-labs-sync-code";
const LEGACY_CODE_KEY = "prism-pop-sync-code";
const APP_ID = "prism-pop";

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const store = (): KV | undefined => (typeof localStorage !== "undefined" ? localStorage : undefined);

/** Reads the shared Sabin Labs ID, migrating a code saved by older versions of this game. */
export function readCode(s: KV | undefined = store()): string | null {
  try {
    const shared = s?.getItem(SHARED_CODE_KEY);
    if (shared && parseSyncCode(shared)) return shared;
    const legacy = s?.getItem(LEGACY_CODE_KEY);
    if (legacy && parseSyncCode(legacy)) {
      s?.setItem(SHARED_CODE_KEY, legacy);
      s?.removeItem(LEGACY_CODE_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeCode(code: string | null, s: KV | undefined = store()): void {
  try {
    if (code) s?.setItem(SHARED_CODE_KEY, code);
    else s?.removeItem(SHARED_CODE_KEY);
    s?.removeItem(LEGACY_CODE_KEY);
  } catch {
    /* storage blocked: sync stays on for this session only */
  }
}

/** Keeps progress in sync across devices with an end-to-end encrypted sync code. */
export function useProgressSync(progress: Progress, setProgress: (p: Progress) => void) {
  const [code, setCode] = useState<string | null>(() => readCode());
  const [status, setStatus] = useState<SyncStatus>(code ? "syncing" : "off");
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const latest = useRef(progress);
  latest.current = progress;
  const running = useRef(false);

  const run = useCallback(async () => {
    if (!code || running.current) return;
    running.current = true;
    setStatus("syncing");
    try {
      const { merged, changedLocal } = await syncOnce(new SyncClient(code, APP_ID), latest.current);
      if (changedLocal) setProgress(merged);
      setStatus("synced");
      setLastSynced(Date.now());
    } catch {
      setStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error");
    } finally {
      running.current = false;
    }
  }, [code, setProgress]);

  // Sync shortly after any change, and whenever the game comes back to the foreground.
  useEffect(() => {
    if (!code) return;
    const t = setTimeout(run, 2000);
    return () => clearTimeout(t);
  }, [code, progress, run]);

  useEffect(() => {
    if (!code) return;
    const onVisible = () => document.visibilityState === "visible" && void run();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [code, run]);

  const turnOn = () => {
    const c = newSyncCode();
    writeCode(c);
    setCode(c);
  };

  /** Connects to the code from another device; returns false when the code is not valid. */
  const useCode = (text: string): boolean => {
    const c = text.trim();
    if (!parseSyncCode(c)) return false;
    writeCode(c);
    setCode(c);
    return true;
  };

  const turnOff = () => {
    writeCode(null);
    setCode(null);
    setStatus("off");
  };

  return { code, status, lastSynced, turnOn, useCode, turnOff, syncNow: run };
}
