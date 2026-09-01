import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { SiteSettings } from "@wa-marketing-bd/shared-types";
import { NoticeModal } from "./NoticeModal";

export function GlobalNoticeManager() {
  const profile = useAuthStore((s) => s.profile);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!profile) return;

    let mounted = true;
    async function load() {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (mounted && data) {
        setSettings(data as SiteSettings);
      }
    }
    load();
    return () => { mounted = false; };
  }, [profile]);

  useEffect(() => {
    if (!profile || !settings) return;
    if (!settings.is_admin_notice_active || !settings.admin_notice_text) {
      return;
    }

    const noticeUpdatedAt = settings.admin_notice_updated_at;
    const userLastSeenAt = profile.last_seen_notice_at;

    if (!noticeUpdatedAt) return;

    if (!userLastSeenAt || new Date(userLastSeenAt) < new Date(noticeUpdatedAt)) {
      setShowModal(true);
    }
  }, [profile, settings]);

  const handleDismiss = async () => {
    setShowModal(false);
    if (!profile) return;

    const currentTimestamp = new Date().toISOString();
    
    useAuthStore.setState((state) => {
      if (state.profile) {
        return {
          profile: {
            ...state.profile,
            last_seen_notice_at: currentTimestamp,
          },
        };
      }
      return state;
    });

    await supabase
      .from("profiles")
      .update({ last_seen_notice_at: currentTimestamp })
      .eq("id", profile.id);
  };

  if (!showModal || !settings?.admin_notice_text) return null;

  return (
    <NoticeModal
      noticeText={settings.admin_notice_text}
      onDismiss={handleDismiss}
    />
  );
}
