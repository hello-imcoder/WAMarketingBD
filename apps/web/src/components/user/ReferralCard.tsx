// apps/web/src/components/user/ReferralCard.tsx
// Referral section (§6.5) — code, copyable invite link, bonus history.
// Code generation itself is done at signup (0013 handle_new_user); ?ref=CODE
// pre-fill works since Milestone 3.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Gift, Users } from "lucide-react";
import { useReferrals } from "@/hooks/useReferrals";
import { useAuthStore } from "@/stores/authStore";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ListSkeleton,
  Pagination,
  statusTone,
  useToast,
} from "@/components/app/ui";

const REF_PAGE_SIZE = 10;

export function ReferralCard(): React.ReactElement | null {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [page, setPage] = useState(1);
  const { referrals, total, isLoading, error } = useReferrals(page, REF_PAGE_SIZE);
  const { success: toastSuccess } = useToast();

  if (profile === null) return null;
  const code = profile.referral_code;
  const link = `${window.location.origin}/reg?ref=${code}`;

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link);
      toastSuccess(t("referral.copied"));
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <Card>
      <CardHeader
        title={t("referral.title")}
        description={t("referral.description")}
        icon={<Gift size={18} />}
      />
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-canvas-soft px-4 py-3">
          <code className="wt-540 text-lg tracking-widest text-ink">{code}</code>
          <Button variant="outline" size="sm" onClick={() => void copyLink()}>
            <Copy size={14} />
            {t("referral.copyLink")}
          </Button>
        </div>

        {isLoading && <ListSkeleton rows={3} rowClass="h-12" />}

        {error !== null && (
          <p role="alert" className="m-0 text-sm text-danger">
            {t("referral.error.loadFailed")}
          </p>
        )}

        {!isLoading && error === null && referrals.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title={t("referral.empty")}
          />
        ) : (
          referrals.length > 0 && (
            <>
              <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
                {referrals.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 px-4 py-3"
                  >
                    <span className="text-sm text-ink">
                      {t("referral.bonusAmount")}: <span className="wt-540">৳{r.bonus_amount}</span>
                    </span>
                    <Badge tone={r.bonus_paid ? statusTone("approved") : statusTone("pending")}>
                      {r.bonus_paid ? t("referral.paid") : t("referral.pendingBonus")}
                    </Badge>
                  </div>
                ))}
              </div>
              <Pagination
                page={page}
                pageSize={REF_PAGE_SIZE}
                total={total}
                onPage={setPage}
              />
            </>
          )
        )}
      </CardBody>
    </Card>
  );
}
