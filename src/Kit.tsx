import { useEffect, useId, type ReactNode } from "react";

/** Small shared pieces of the Prism Pop UI kit (see docs/DESIGN-SYSTEM.md). */

/** Pill switch; replaces native checkboxes. */
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch${checked ? " switch--on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__knob" />
      </button>
    </label>
  );
}

/** Banner with folded ends that heads a sheet. */
export function Ribbon({ children, tone = "violet" }: { children: ReactNode; tone?: "violet" | "gold" | "pink" }) {
  return (
    <div className={`ribbon ribbon--${tone}`}>
      <h2 className="display">{children}</h2>
    </div>
  );
}

/** Modal sheet with a ribbon title. Clicking the backdrop or pressing Escape calls onClose when given. */
export function Sheet({
  title,
  tone,
  onClose,
  children,
  className = "",
  labelledBy,
}: {
  title?: ReactNode;
  tone?: "violet" | "gold" | "pink";
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={`sheet panel ${className}`}>
        {title && (
          <Ribbon tone={tone}>
            <span id={titleId}>{title}</span>
          </Ribbon>
        )}
        {children}
      </div>
    </div>
  );
}

/** In-app confirmation; replaces window.confirm, which looks like a browser error on Android. */
export function Confirm({
  text,
  yes,
  no,
  onYes,
  onNo,
}: {
  text: string;
  yes: string;
  no: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <Sheet onClose={onNo} className="confirm">
      <p className="confirm__text">{text}</p>
      <div className="confirm__row">
        <button className="btn btn--ghost" onClick={onNo} autoFocus>
          {no}
        </button>
        <button className="btn btn--danger" onClick={onYes}>
          {yes}
        </button>
      </div>
    </Sheet>
  );
}
