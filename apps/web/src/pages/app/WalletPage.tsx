// apps/web/src/pages/app/WalletPage.tsx
// Route: "/app/wallet" — balances (total + verified, §6.3) + withdrawal request
// + earnings insight chart. Balances are maintained by service-role Edge
// Functions (approval flows, M11); this page is read-only on them. Withdrawal
// creation is a direct RLS INSERT of a `pending` row — client-side validation
// per approved decision (a).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import { applySeo } from "@/lib/seo";
import { useWallet } from "@/hooks/useWallet";
import { WithdrawalForm } from "@/components/user/WithdrawalForm";
import { ReferralCard } from "@/components/user/ReferralCard";
import { EarningsChart } from "@/components/app/charts/EarningsChart";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  Pagination,
  StatCard,
  statusTone,
} from "@/components/app/ui";

const WD_PAGE_SIZE = 10;

export default function WalletPage(): React.ReactElement {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { wallet, settings, withdrawals, withdrawalsTotal, isLoading, error, reload } =
    useWallet(page, WD_PAGE_SIZE);

  useEffect(() => {
    applySeo({ title: t("wallet.meta.title"), description: t("wallet.meta.description") });
  }, [t]);

  const minAmount = settings?.min_withdrawal_amount ?? 0;
  const balanceVerified = wallet?.balance_verified ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("wallet.title")} />

      {error !== null && (
        <p role="alert" className="m-0 text-sm text-danger">
          {t("wallet.error.loadFailed")}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-20 animate-pulse rounded-xl bg-canvas-soft" aria-hidden />
          <div className="h-20 animate-pulse rounded-xl bg-canvas-soft" aria-hidden />
        </div>
      ) : (
        wallet !== null && (
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              icon={<WalletIcon size={20} />}
              label={t("wallet.balanceTotal")}
              value={`৳${wallet.balance_total}`}
            />
            <StatCard
              icon={<ShieldCheck size={20} />}
              label={t("wallet.balanceVerified")}
              value={`৳${wallet.balance_verified}`}
              tone="success"
              hint={t("wallet.withdrawTitle")}
            />
          </div>
        )
      )}

      {wallet !== null && (
        <Card>
          <CardHeader title={t("wallet.insights.cardTitle")} />
          <CardBody>
            <EarningsChart />
          </CardBody>
        </Card>
      )}

      {settings !== null && (
        <Card>
          <CardHeader
            title={t("wallet.withdrawTitle")}
            description={t("wallet.minNote", { min: minAmount })}
            icon={<ArrowDownToLine size={18} />}
          />
          <CardBody>
            <WithdrawalForm
              minAmount={minAmount}
              balanceVerified={balanceVerified}
              onRequested={() => {
                setPage(1);
                reload();
              }}
            />
          </CardBody>
        </Card>
      )}

      {withdrawals.length > 0 ? (
        <Card>
          <CardHeader title={t("wallet.historyTitle")} />
          <CardBody className="flex flex-col gap-4 pt-4">
            <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
              {withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="wt-540 m-0 text-sm text-ink">
                      ৳{w.amount} · {t(`wallet.provider.${w.provider}`)} · …
                      {w.account_number.slice(-4)}
                    </p>
                    <p className="m-0 text-xs text-ink-faint">
                      {new Date(w.requested_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge tone={statusTone(w.status)}>{t(`wallet.status.${w.status}`)}</Badge>
                </div>
              ))}
            </div>
            <Pagination
              page={page}
              pageSize={WD_PAGE_SIZE}
              total={withdrawalsTotal}
              onPage={setPage}
            />
          </CardBody>
        </Card>
      ) : (
        !isLoading && (
          <EmptyState title={t("wallet.historyEmpty")} hint={t("wallet.historyEmptyHint")} />
        )
      )}

      <ReferralCard />
    </div>
  );
}
