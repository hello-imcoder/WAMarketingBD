// apps/web/src/components/admin/ui/Modal.tsx
// Centered dialog — escape/backdrop close; content stays mounted only when open.
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Overlay, useEscape } from "./Overlay";

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}): React.ReactElement | null {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <Overlay onClose={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          className={`w-full ${maxWidth} rounded-xl bg-canvas p-5 shadow-2`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
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
          {children}
        </div>
      </div>
    </Overlay>
  );
}
