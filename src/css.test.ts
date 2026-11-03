import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards against a stylesheet that silently stops applying: an unclosed block makes every rule after it
 * part of the broken one, so the browser drops them without any error.
 */
const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

/** Strips comments and strings, then returns the brace depth before each top-level selector. */
function scan(src: string) {
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
  let depth = 0;
  let min = 0;
  const openedAt: Record<string, number> = {};
  let selector = "";
  for (const ch of clean) {
    if (ch === "{") {
      const sel = selector.trim();
      for (const part of sel.split(",")) {
        const name = part.trim();
        if (name.startsWith(".") && !(name in openedAt)) openedAt[name] = depth;
      }
      depth++;
      selector = "";
    } else if (ch === "}") {
      depth--;
      min = Math.min(min, depth);
      selector = "";
    } else if (ch === ";") {
      selector = "";
    } else {
      selector += ch;
    }
  }
  return { depth, min, openedAt };
}

describe("index.css", () => {
  const { depth, min, openedAt } = scan(css);

  it("closes every block it opens", () => {
    expect(min).toBe(0);
    expect(depth).toBe(0);
  });

  it("declares the core UI kit classes at the top level", () => {
    for (const cls of [".btn", ".panel", ".sheet", ".ribbon", ".topbar", ".tabs", ".hud", ".board", ".booster", ".road", ".node", ".scenery", ".switch"]) {
      expect(openedAt[cls], cls).toBe(0);
    }
  });
});
