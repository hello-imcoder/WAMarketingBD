// apps/web/src/pages/rexio-admin/AdminTaskManagerPage.tsx
// Route: "/rexio-admin/tasks" — task create/edit/pause (§7.1).
// Direct RLS-scoped writes (tasks: admin insert/update via is_su_admin()).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { adminTaskCreateSchema } from "@wa-marketing-bd/shared-types";
import { useAdminTasks } from "@/hooks/useAdminTasks";
import type { Task } from "@wa-marketing-bd/shared-types";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--color-hairline)",
  borderRadius: "var(--rounded-sm)",
  fontSize: "14px",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-ink-mute)",
  display: "block",
  marginBottom: "4px",
};
const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: "var(--rounded-sm)",
  border: "1px solid var(--color-hairline)",
  background: "transparent",
  fontSize: "12px",
  cursor: "pointer",
};

export default function AdminTaskManagerPage(): React.ReactElement {
  const { t } = useTranslation();
  const { tasks, isLoading, error, createTask, updateTask } = useAdminTasks();
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState({
    whatsappNumber: "",
    message: "",
    payoutAmount: "",
    maxCompletions: "",
    expiresAt: "",
  });

  function resetForm(): void {
    setForm({ whatsappNumber: "", message: "", payoutAmount: "", maxCompletions: "", expiresAt: "" });
    setEditing(null);
    setFormError(null);
  }

  function startEdit(task: Task): void {
    setEditing(task);
    setForm({
      whatsappNumber: task.whatsapp_number,
      message: task.message,
      payoutAmount: String(task.payout_amount),
      maxCompletions: String(task.max_completions),
      expiresAt: task.expires_at.slice(0, 16),
    });
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const expiresIso = new Date(form.expiresAt).toISOString();
    if (editing === null) {
      const parsed = adminTaskCreateSchema.safeParse({
        whatsappNumber: form.whatsappNumber,
        message: form.message,
        payoutAmount: Number(form.payoutAmount),
        maxCompletions: Number(form.maxCompletions),
        expiresAt: expiresIso,
      });
      if (!parsed.success) {
        setFormError("validation_failed");
        return;
      }
      const err = await createTask(parsed.data);
      if (err !== null) setFormError(err);
      else resetForm();
    } else {
      const err = await updateTask(editing.id, {
        whatsapp_number: form.whatsappNumber,
        message: form.message,
        payout_amount: Number(form.payoutAmount),
        max_completions: Number(form.maxCompletions),
        expires_at: expiresIso,
      });
      if (err !== null) setFormError(err);
      else resetForm();
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--spacing-xxl)" }}>
      <section>
        <h1 style={{ fontSize: "22px", fontVariationSettings: '"wght" 540', margin: "0 0 16px" }}>
          {editing === null ? t("admin.tasks.createTitle") : t("admin.tasks.editTitle")}
        </h1>
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "grid", gap: "var(--spacing-md)", maxWidth: "520px" }}>
          <div>
            <label htmlFor="wa-number" style={labelStyle}>{t("admin.tasks.whatsappNumber")}</label>
            <input id="wa-number" style={inputStyle} value={form.whatsappNumber} inputMode="numeric"
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="8801XXXXXXXXX" />
          </div>
          <div>
            <label htmlFor="wa-message" style={labelStyle}>{t("admin.tasks.message")}</label>
            <textarea id="wa-message" style={{ ...inputStyle, minHeight: "80px" }} value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-md)" }}>
            <div>
              <label htmlFor="payout" style={labelStyle}>{t("admin.tasks.payout")}</label>
              <input id="payout" style={inputStyle} value={form.payoutAmount} inputMode="numeric"
                onChange={(e) => setForm({ ...form, payoutAmount: e.target.value })} />
            </div>
            <div>
              <label htmlFor="maxc" style={labelStyle}>{t("admin.tasks.maxCompletions")}</label>
              <input id="maxc" style={inputStyle} value={form.maxCompletions} inputMode="numeric"
                onChange={(e) => setForm({ ...form, maxCompletions: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="expires" style={labelStyle}>{t("admin.tasks.expiresAt")}</label>
            <input id="expires" type="datetime-local" style={inputStyle} value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </div>
          {formError !== null && (
            <p role="alert" style={{ color: "#b3261e", fontSize: "14px", margin: 0 }}>
              {t(`admin.error.${formError}`)}
            </p>
          )}
          <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
            <button type="submit" style={{ padding: "12px 20px", borderRadius: "var(--rounded-md)", border: "none", background: "var(--color-primary)", color: "var(--color-on-primary)", fontSize: "14px", fontVariationSettings: '"wght" 600', cursor: "pointer" }}>
              {editing === null ? t("admin.tasks.createButton") : t("admin.tasks.saveButton")}
            </button>
            {editing !== null && (
              <button type="button" onClick={resetForm} style={btnStyle}>
                {t("common.cancel")}
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: "18px", fontVariationSettings: '"wght" 540', margin: "0 0 12px" }}>
          {t("admin.tasks.listTitle")}
        </h2>
        {isLoading && <p role="status">{t("common.loading")}</p>}
        {error !== null && <p role="alert">{t("admin.error.load_failed")}</p>}
        <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
          {tasks.map((task) => (
            <div key={task.id} style={{ border: "1px solid var(--color-hairline)", borderRadius: "var(--rounded-md)", padding: "var(--spacing-lg)", background: "var(--color-canvas)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--spacing-sm)" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontVariationSettings: '"wght" 600' }}>
                    ৳{task.payout_amount} · +{task.whatsapp_number}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-ink-mute)" }}>
                    {task.message.length > 80 ? `${task.message.slice(0, 80)}…` : task.message}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-ink-faint)" }}>
                    {task.completion_count}/{task.max_completions} · {new Date(task.expires_at).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "var(--spacing-sm)", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: task.status === "active" ? "var(--color-surface-teal-deep)" : "var(--color-ink-mute)" }}>
                    {t(`history.status.${task.status}`)}
                  </span>
                  <button type="button" onClick={() => void updateTask(task.id, { status: task.status === "active" ? "paused" : "active" })} style={btnStyle}>
                    {task.status === "active" ? t("admin.tasks.pause") : t("admin.tasks.resume")}
                  </button>
                  <button type="button" onClick={() => startEdit(task)} style={btnStyle}>
                    {t("admin.tasks.edit")}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && tasks.length === 0 && <p style={{ color: "var(--color-ink-mute)" }}>{t("admin.tasks.empty")}</p>}
        </div>
      </section>
    </div>
  );
}

