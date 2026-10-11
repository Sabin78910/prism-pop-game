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

const CODE_KEY = "prism-pop-sync-code";
const APP_ID = "prism-pop";

function readCode(): string | null {
  try {
    return localStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

function writeCode(code: string | null): void {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    /* storage blocked: sync stays on for this session only */
  }
}

/** Keeps progress in sync across devices with an end-to-end encrypted sync code. */
export function useProgressSync(progress: Progress, setProgress: (p: Progress) => void) {
  const [code, setCode] = useState<string | null>(readCode);
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
