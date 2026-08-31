// apps/web/src/layouts/AdminLayout.tsx
// Admin panel layout — /rexio-admin
// §9: noindex,nofollow meta required at layout level (not just robots.txt).
import { useEffect } from "react";
import { Outlet } from "react-router";
import { applySeo } from "@/lib/seo";

export default function AdminLayout(): React.ReactElement {
  useEffect(() => {
    applySeo({
      title: "Admin",
      description: "",
      noIndex: true, // REQUIREMENT.md §9 — must never be indexed
    });
  }, []);

  return (
    <div>
      {/* noindex meta is applied via applySeo above */}
      <Outlet />
    </div>
  );
}
