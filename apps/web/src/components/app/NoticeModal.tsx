import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface NoticeModalProps {
  onDismiss: () => void;
  noticeText: string;
}

export function NoticeModal({ onDismiss, noticeText }: NoticeModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--spacing-md)",
      }}
    >
      <div
        style={{
          background: "var(--color-primary)",
          borderRadius: "var(--rounded-xl)",
          width: "100%",
          maxWidth: "400px",
          padding: "var(--spacing-xl)",
          color: "var(--color-on-primary)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "var(--spacing-md)" }}>
          🔔
        </div>
        <h2
          style={{
            fontSize: "24px",
            fontVariationSettings: '"wght" 600',
            margin: "0 0 var(--spacing-lg) 0",
            color: "#60a5fa",
          }}
        >
          New Notice
        </h2>
        
        <div
          style={{
            background: "var(--color-primary-deep)",
            padding: "var(--spacing-lg)",
            borderRadius: "var(--rounded-lg)",
            width: "100%",
            maxHeight: "350px",
            overflowY: "auto",
            marginBottom: "var(--spacing-xl)",
            lineHeight: 1.6,
            fontSize: "15px",
            textAlign: "center",
            whiteSpace: "pre-wrap",
          }}
        >
          {noticeText}
        </div>

        <button
          onClick={onDismiss}
          style={{
            background: "#8b5cf6",
            color: "white",
            border: "none",
            borderRadius: "var(--rounded-full)",
            padding: "var(--spacing-md) var(--spacing-xxl)",
            fontSize: "16px",
            fontVariationSettings: '"wght" 600',
            cursor: "pointer",
            width: "100%",
            maxWidth: "250px",
          }}
        >
          Understood ✅
        </button>
      </div>
    </div>
  );
}
