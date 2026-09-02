// apps/web/src/components/admin/ui/Sheet.tsx
// Slide-over panel — docked right on ≥sm, full-screen on mobile.
// Used for Create/Edit Task and screenshot lightbox.
import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Overlay, useEscape } from "./Overlay";

export function Sheet({
  open,
  onClose,
  title,
  children,
  width = "sm:max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}): React.ReactElement | null {
  useEscape(open, onClose);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <Overlay onClose={onClose} zClass="z-50">
      <div className="flex h-full items-stretch justify-end">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className={`flex h-full w-full flex-col bg-canvas shadow-2 ${width} animate-[sheet-in_180ms_ease-out]`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <h2 className="wt-540 m-0 text-base text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="cursor-pointer rounded-md p-1 text-ink-mute transition-colors hover:bg-canvas-soft hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </Overlay>
  );
}
