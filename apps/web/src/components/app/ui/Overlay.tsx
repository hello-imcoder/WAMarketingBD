// apps/web/src/components/app/ui/Overlay.tsx
// Shared backdrop + escape handling for Modal and Sheet.
import { useEffect } from "react";

export function useEscape(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

export function Overlay({
  onClose,
  children,
  zClass = "z-40",
}: {
  onClose: () => void;
  children: React.ReactNode;
  zClass?: string;
}): React.ReactElement {
  return (
    <div
      className={`fixed inset-0 ${zClass} bg-[rgba(14,12,31,0.55)]`}
      onClick={onClose}
      role="presentation"
    >
      {children}
    </div>
  );
}
