import { memo } from "react";
import { WORLD_THEME, type WorldId } from "./game/worlds";

/**
 * "Prism Noir" backdrop: deep ink lit by two soft pools of light in the world's accent and a spectral rim at the
 * bottom, all plain CSS gradients. No image files to download and nothing animated, so it costs nothing per frame.
 */
export const Scenery = memo(function Scenery({ world }: { world: WorldId }) {
  const { accent, deep } = WORLD_THEME[world];
  return <div className="scenery" aria-hidden="true" data-world={world} style={{ "--accent": accent, "--deep": deep } as React.CSSProperties} />;
});
