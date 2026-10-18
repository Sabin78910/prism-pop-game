import { describe, expect, it } from "vitest";
import { parseIdToken, readGoogleUser, writeGoogleUser } from "./googleAuth";

const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe("google auth", () => {
  it("reads the profile from an ID token", () => {
    const jwt = `h.${b64({ sub: "123", name: "Sabin K", picture: "https://x/y.png" })}.s`;
    expect(parseIdToken(jwt)).toEqual({ sub: "123", name: "Sabin K", picture: "https://x/y.png" });
  });
  it("rejects a token without a subject or with garbage", () => {
    expect(parseIdToken(`h.${b64({ name: "x" })}.s`)).toBeNull();
    expect(parseIdToken("nope")).toBeNull();
  });
  it("stores, reads and clears the signed-in user", () => {
    const s = mem();
    writeGoogleUser({ sub: "1", name: "A" }, s);
    expect(readGoogleUser(s)).toEqual({ sub: "1", name: "A" });
    writeGoogleUser(null, s);
    expect(readGoogleUser(s)).toBeNull();
  });
});
