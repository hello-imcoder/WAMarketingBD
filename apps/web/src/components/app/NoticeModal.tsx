// apps/web/src/components/app/NoticeModal.tsx
// Admin notice / support notice popup — built on the app UI kit Modal.
// Same props API as before (onDismiss, noticeText); content i18n'd.
// The body scrolls (max-h) so long notices never push the confirm button
// off-screen, and break-words keeps long unbroken strings from overflowing.
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { Button, Modal } from "@/components/app/ui";

interface NoticeModalProps {
  onDismiss: () => void;
  noticeText: string;
}

export function NoticeModal({ onDismiss, noticeText }: NoticeModalProps) {
  const { t } = useTranslation();
  return (
    <Modal
      open
      onClose={onDismiss}
      title={t("app.notice.title")}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-info-soft text-info">
            <Bell size={18} />
          </span>
          <div
            className="min-w-0 flex-1 max-h-[45dvh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-canvas-soft p-4 text-left text-sm leading-relaxed text-ink"
          >
            {noticeText}
          </div>
        </div>
        <Button variant="primary" onClick={onDismiss} className="w-full">
          {t("app.notice.confirm")}
        </Button>
      </div>
    </Modal>
  );
}
