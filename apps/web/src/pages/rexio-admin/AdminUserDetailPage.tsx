// apps/web/src/pages/rexio-admin/AdminUserDetailPage.tsx
// Route: "/rexio-admin/users/:userId" — profile, wallet, submission/withdrawal
// history (admin RLS reads) + verify/ban/suspend actions via the
// admin-update-user Edge Function (SECURITY.md §1 — server-side only).
// Destructive actions get a ConfirmDialog; results via toast.
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminUserActions } from "@/hooks/useAdminUsers";
import type { UserActionErrorCode } from "@/hooks/useAdminUsers";
import type { Profile, Submission, Wallet, Withdrawal } from "@wa-marketing-bd/shared-types";
import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  statusTone,
  Button,
  ConfirmDialog,
  EmptyState,
  ListSkeleton,
  useToast,
} from "@/components/admin/ui";

type PendingAction =
  | { kind: "verify" }
  | { kind: "suspend" }
  | { kind: "ban" }
  | null;

export default function AdminUserDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const { updateUser } = useAdminUserActions();
  const { success, error: toastError } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (userId === undefined) return;
    setIsLoading(true);
    setError(null);
    const [pRes, wRes, sRes, wdRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("submissions").select("*").eq("user_id", userId).order("submitted_at", { ascending: false }).limit(20),
      supabase.from("withdrawals").select("*").eq("user_id", userId).order("requested_at", { ascending: false }).limit(20),
    ]);
    if (pRes.error !== null) setError("load_failed");
    else {
      setProfile((pRes.data ?? null) as Profile | null);
      setWallet((wRes.data ?? null) as Wallet | null);
      setSubmissions((sRes.data ?? []) as Submission[]);
      setWithdrawals((wdRes.data ?? []) as Withdrawal[]);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(patch: { isVerified?: boolean; isBanned?: boolean; suspendedAt?: string | null }): Promise<void> {
    if (userId === undefined) return;
    setBusy(true);
    const code: UserActionErrorCode | null = await updateUser(userId, patch);
    setBusy(false);
    if (code !== null) {
      toastError(t("admin.error.generic"));
      return;
    }
    success(t("admin.users.updatedToast"));
    setPending(null);
    await load();
  }

  if (isLoading) return <ListSkeleton rows={5} />;
  if (error !== null || profile === null) {
    return (
      <EmptyState
        title={t("admin.error.load_failed")}
        action={
          <Button variant="outline" size="sm" onClick={() => void load()}>
            {t("common.retry", "Retry")}
          </Button>
        }
      />
    );
  }

  const confirmConfig: Record<
    Exclude<PendingAction, null>["kind"],
    { title: string; message: string; confirm: string; patch: Record<string, unknown> }
  > = {
    verify: {
      title: profile.is_verified ? t("admin.users.unverify") : t("admin.users.verify"),
      message: profile.is_verified
        ? t("admin.users.unverifyConfirmMsg", { name: profile.name || profile.phone })
        : t("admin.users.verifyConfirmMsg", { name: profile.name || profile.phone }),
      confirm: profile.is_verified ? t("admin.users.unverify") : t("admin.users.verify"),
      patch: { isVerified: !profile.is_verified },
    },
    suspend: {
      title: profile.suspended_at === null ? t("admin.users.suspend") : t("admin.users.unsuspend"),
      message:
        profile.suspended_at === null
          ? t("admin.users.suspendConfirmMsg", { name: profile.name || profile.phone })
          : t("admin.users.unsuspendConfirmMsg", { name: profile.name || profile.phone }),
      confirm: profile.suspended_at === null ? t("admin.users.suspend") : t("admin.users.unsuspend"),
      patch: { suspendedAt: profile.suspended_at === null ? new Date().toISOString() : null },
    },
    ban: {
      title: profile.is_banned ? t("admin.users.unban") : t("admin.users.ban"),
      message:
        profile.is_banned
          ? t("admin.users.unbanConfirmMsg", { name: profile.name || profile.phone })
          : t("admin.users.banConfirmMsg", { name: profile.name || profile.phone }),
      confirm: profile.is_banned ? t("admin.users.unban") : t("admin.users.ban"),
      patch: { isBanned: !profile.is_banned },
    },
  };

  return (
    <>
      <Link
        to="/rexio-admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-info no-underline hover:underline"
      >
        <ArrowLeft size={14} /> {t("admin.users.backToUsers")}
      </Link>

      {error !== null && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {t("admin.error.generic")}
        </p>
      )}

      {/* ── Profile ─────────────────────────────────────────────────── */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="wt-540 m-0 text-lg text-ink">{profile.name === "" ? "—" : profile.name}</h1>
            <span className="text-sm text-ink-mute">{profile.phone}</span>
            {profile.is_verified && <Badge tone="success">{t("admin.users.verified")}</Badge>}
            {profile.is_banned && <Badge tone="danger">{t("admin.users.banned")}</Badge>}
            {profile.suspended_at !== null && <Badge tone="warning">{t("admin.users.suspended")}</Badge>}
            {profile.role === "su_admin" && <Badge tone="info">{t("admin.users.admin")}</Badge>}
          </div>
          <p className="mt-1 text-[13px] text-ink-mute">
            {t("admin.users.referralCode")}: {profile.referral_code} · {t("admin.users.joined")}:{" "}
            {new Date(profile.created_at).toLocaleDateString()}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={profile.is_verified ? "outline" : "success"}
              onClick={() => setPending({ kind: "verify" })}
            >
              {profile.is_verified ? t("admin.users.unverify") : t("admin.users.verify")}
            </Button>
            <Button
              size="sm"
              variant={profile.suspended_at === null ? "outline" : "outline"}
              onClick={() => setPending({ kind: "suspend" })}
            >
              {profile.suspended_at === null ? t("admin.users.suspend") : t("admin.users.unsuspend")}
            </Button>
            <Button
              size="sm"
              variant={profile.is_banned ? "outline" : "danger"}
              onClick={() => setPending({ kind: "ban" })}
            >
              {profile.is_banned ? t("admin.users.unban") : t("admin.users.ban")}
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        {/* ── Wallet ────────────────────────────────────────────────── */}
        {wallet !== null && (
          <Card>
            <CardHeader title={t("admin.users.wallet")} />
            <CardBody>
              <p className="m-0 text-sm">
                <span className="text-ink-mute">{t("wallet.balanceTotal")}:</span>{" "}
                <span className="wt-540 text-ink">৳{wallet.balance_total.toLocaleString()}</span>
                {" · "}
                <span className="text-ink-mute">{t("wallet.balanceVerified")}:</span>{" "}
                <span className="wt-540 text-ink">৳{wallet.balance_verified.toLocaleString()}</span>
              </p>
            </CardBody>
          </Card>
        )}

        {/* ── Withdrawals ───────────────────────────────────────────── */}
        <Card>
          <CardHeader title={t("admin.users.withdrawals")} />
          <CardBody className="pt-0">
            {withdrawals.length === 0 ? (
              <p className="m-0 text-[13px] text-ink-mute">{t("admin.users.none")}</p>
            ) : (
              <div className="flex flex-col divide-y divide-hairline">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="text-[13px] text-ink">
                      ৳{w.amount.toLocaleString()} · {t(`wallet.provider.${w.provider}`)}
                    </span>
                    <Badge tone={statusTone(w.status)}>{t(`history.status.${w.status}`)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* ── Submissions ───────────────────────────────────────────── */}
        <Card className="xl:col-span-2">
          <CardHeader title={t("admin.users.submissions")} />
          <CardBody className="pt-0">
            {submissions.length === 0 ? (
              <p className="m-0 text-[13px] text-ink-mute">{t("admin.users.none")}</p>
            ) : (
              <div className="flex flex-col divide-y divide-hairline">
                {submissions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span className="text-[13px] text-ink">
                      {new Date(s.submitted_at).toLocaleDateString()}
                      {s.rejection_reason !== null && (
                        <span className="text-danger"> — {s.rejection_reason}</span>
                      )}
                    </span>
                    <Badge tone={statusTone(s.status)}>{t(`history.status.${s.status}`)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Confirm dialog ──────────────────────────────────────────── */}
      {pending !== null && (
        <ConfirmDialog
          open
          busy={busy}
          tone={pending.kind === "ban" ? "danger" : "primary"}
          title={confirmConfig[pending.kind].title}
          message={confirmConfig[pending.kind].message}
          confirmLabel={confirmConfig[pending.kind].confirm}
          cancelLabel={t("common.cancel")}
          onConfirm={() => void act(confirmConfig[pending.kind].patch)}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
