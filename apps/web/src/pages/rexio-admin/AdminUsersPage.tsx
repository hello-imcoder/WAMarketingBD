// apps/web/src/pages/rexio-admin/AdminUsersPage.tsx
// Route: "/rexio-admin/users" — user list/search with status filter chips,
// debounced search, server pagination. Table on desktop, cards on mobile.
// Ban/suspend/verify mutations live on the detail page (Edge Function path).
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import type { UserStatusFilter } from "@/hooks/useAdminUsers";
import {
  PageHeader,
  Badge,
  Input,
  Button,
  EmptyState,
  ListSkeleton,
  Pagination,
} from "@/components/admin/ui";

const PAGE_SIZE = 20;

function UserBadges({ user }: { user: { is_verified: boolean; is_banned: boolean; suspended_at: string | null; role: string } }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5">
      {user.is_verified && <Badge tone="success">{t("admin.users.verified")}</Badge>}
      {user.is_banned && <Badge tone="danger">{t("admin.users.banned")}</Badge>}
      {user.suspended_at !== null && <Badge tone="warning">{t("admin.users.suspended")}</Badge>}
      {user.role === "su_admin" && <Badge tone="info">{t("admin.users.admin")}</Badge>}
    </div>
  );
}

export default function AdminUsersPage(): React.ReactElement {
  const { t } = useTranslation();
  const [status, setStatus] = useState<UserStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");

  // Debounce the search box.
  useEffect(() => {
    const id = window.setTimeout(() => setTerm(input), 350);
    return () => window.clearTimeout(id);
  }, [input]);

  const { users, total, isLoading, error } = useAdminUsers({
    page,
    pageSize: PAGE_SIZE,
    status,
    term,
  });

  const filters: Array<{ key: UserStatusFilter; label: string }> = [
    { key: "all", label: t("admin.filter.all") },
    { key: "verified", label: t("admin.users.verified") },
    { key: "banned", label: t("admin.users.banned") },
    { key: "suspended", label: t("admin.users.suspended") },
  ];

  return (
    <>
      <PageHeader title={t("admin.users.title")} description={t("admin.users.listDesc")} />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setStatus(f.key);
                setPage(1);
              }}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-[13px] wt-540 transition-colors ${
                status === f.key
                  ? "bg-primary text-on-primary"
                  : "border border-hairline bg-canvas text-ink-mute hover:bg-canvas-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(input);
            setPage(1);
          }}
          className="flex gap-2 md:w-72"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("admin.users.searchPlaceholder")}
            aria-label={t("admin.users.searchPlaceholder")}
          />
          <Button type="submit" variant="outline" aria-label={t("admin.users.searchButton")}>
            <Search size={15} />
          </Button>
        </form>
      </div>

      {error !== null && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {t("admin.error.load_failed")}
        </p>
      )}

      {isLoading ? (
        <ListSkeleton rows={6} rowClass="h-16" />
      ) : users.length === 0 ? (
        <EmptyState title={t("admin.users.empty")} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-hairline bg-canvas shadow-1 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline bg-canvas-soft text-xs wt-600 uppercase tracking-wide text-ink-mute">
                  <th className="px-5 py-3">{t("admin.users.name")}</th>
                  <th className="px-5 py-3">{t("admin.users.phoneCol")}</th>
                  <th className="px-5 py-3">{t("admin.users.joined")}</th>
                  <th className="px-5 py-3">{t("admin.users.statusCol")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-hairline last:border-0 transition-colors hover:bg-canvas-soft">
                    <td className="px-5 py-3 wt-540 text-ink">
                      <Link to={`/rexio-admin/users/${u.id}`} className="text-info no-underline hover:underline">
                        {u.name === "" ? "—" : u.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-mute">{u.phone}</td>
                    <td className="px-5 py-3 text-ink-mute">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <UserBadges user={u} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {users.map((u) => (
              <Link
                key={u.id}
                to={`/rexio-admin/users/${u.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-canvas p-4 no-underline shadow-1 transition-colors hover:border-ink-faint"
              >
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm wt-540 text-ink">{u.name === "" ? "—" : u.name}</p>
                  <p className="m-0 text-[13px] text-ink-mute">{u.phone}</p>
                </div>
                <UserBadges user={u} />
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mt-4">
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
      </div>
    </>
  );
}
