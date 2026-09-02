// apps/web/src/components/admin/TaskFormSheet.tsx
// Slide-over sheet for creating and editing WhatsApp tasks.
// Create: one entry per number (newline/comma/semicolon separated).
// Edit: single task row — numbers textarea collapses to the one number.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { adminTaskCreateSchema } from "@wa-marketing-bd/shared-types";
import type { Task } from "@wa-marketing-bd/shared-types";
import { Sheet, Field, Textarea, Input, Button, useToast } from "./ui";
import { createAdminTasks, updateAdminTask } from "@/lib/adminTaskActions";

type FormState = {
  whatsappNumbers: string;
  message: string;
  payoutAmount: string;
  maxCompletions: string;
  expiresAt: string;
};

const EMPTY: FormState = {
  whatsappNumbers: "",
  message: "",
  payoutAmount: "",
  maxCompletions: "",
  expiresAt: "",
};

export function TaskFormSheet({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Task | null;
  onSaved: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (editing !== null) {
      setForm({
        whatsappNumbers: editing.whatsapp_number,
        message: editing.message,
        payoutAmount: String(editing.payout_amount),
        maxCompletions: String(editing.max_completions),
        expiresAt: editing.expires_at.slice(0, 16),
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, editing]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const expiresIso = new Date(form.expiresAt).toISOString();
    setSaving(true);
    if (editing === null) {
      const parsed = adminTaskCreateSchema.safeParse({
        whatsappNumbers: form.whatsappNumbers,
        message: form.message,
        payoutAmount: Number(form.payoutAmount),
        maxCompletions: Number(form.maxCompletions),
        expiresAt: expiresIso,
      });
      if (!parsed.success) {
        setSaving(false);
        setFormError("validation_failed");
        return;
      }
      const err = await createAdminTasks(parsed.data);
      setSaving(false);
      if (err !== null) {
        setFormError(err);
        error(t(`admin.error.${err}`));
        return;
      }
      success(t("admin.tasks.createdToast"));
    } else {
      const err = await updateAdminTask(editing.id, {
        whatsapp_number: form.whatsappNumbers,
        message: form.message,
        payout_amount: Number(form.payoutAmount),
        max_completions: Number(form.maxCompletions),
        expires_at: expiresIso,
      });
      setSaving(false);
      if (err !== null) {
        setFormError(err);
        error(t(`admin.error.${err}`));
        return;
      }
      success(t("admin.tasks.updatedToast"));
    }
    onSaved();
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing === null ? t("admin.tasks.createTitle") : t("admin.tasks.editTitle")}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <Field
          label={editing === null ? t("admin.tasks.whatsappNumbers") : t("admin.tasks.whatsappNumber")}
          htmlFor="tf-numbers"
          hint={editing === null ? undefined : t("admin.tasks.whatsappNumberEditHint")}
        >
          <Textarea
            id="tf-numbers"
            rows={editing === null ? 4 : 1}
            value={form.whatsappNumbers}
            onChange={(e) => setForm({ ...form, whatsappNumbers: e.target.value })}
            placeholder={t("admin.tasks.whatsappNumbersPlaceholder")}
          />
        </Field>
        <Field label={t("admin.tasks.message")} htmlFor="tf-message">
          <Textarea
            id="tf-message"
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("admin.tasks.payout")} htmlFor="tf-payout">
            <Input
              id="tf-payout"
              inputMode="numeric"
              value={form.payoutAmount}
              onChange={(e) => setForm({ ...form, payoutAmount: e.target.value })}
            />
          </Field>
          <Field label={t("admin.tasks.maxCompletions")} htmlFor="tf-maxc">
            <Input
              id="tf-maxc"
              inputMode="numeric"
              value={form.maxCompletions}
              onChange={(e) => setForm({ ...form, maxCompletions: e.target.value })}
            />
          </Field>
        </div>
        <Field label={t("admin.tasks.expiresAt")} htmlFor="tf-expires">
          <Input
            id="tf-expires"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
        </Field>
        {formError !== null && (
          <p role="alert" className="m-0 text-sm text-danger">
            {t(`admin.error.${formError}`)}
          </p>
        )}
        <div className="flex gap-2 pt-2">
          <Button type="submit" loading={saving}>
            {editing === null ? t("admin.tasks.createButton") : t("admin.tasks.saveButton")}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
