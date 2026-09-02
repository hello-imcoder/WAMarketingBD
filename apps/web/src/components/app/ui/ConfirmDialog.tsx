// apps/web/src/components/app/ui/ConfirmDialog.tsx
// Confirmation for destructive/irreversible actions (withdraw, P2P transfer).
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "danger" | "primary" | "success";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}): React.ReactElement | null {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 text-warning">
          <AlertTriangle size={20} />
        </span>
        <p className="m-0 text-sm text-ink-mute">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={tone} loading={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
