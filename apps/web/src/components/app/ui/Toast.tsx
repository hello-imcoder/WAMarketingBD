// apps/web/src/components/app/ui/Toast.tsx
// Lightweight toast system for the user panel.
// Mount <AppToastProvider> once in AppLayout; call via useToast().
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; message: string };

const ToastContext = createContext<{
  toast: (tone: ToastTone, message: string) => void;
} | null>(null);

const ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-success" />,
  error: <XCircle size={18} className="text-danger" />,
  info: <Info size={18} className="text-info" />,
};

export function AppToastProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Sits above the mobile bottom nav (bottom-20), flush bottom-right on desktop */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 lg:bottom-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-hairline bg-canvas px-4 py-3 shadow-2 animate-[fade-in_150ms_ease-out]"
          >
            {ICONS[t.tone]}
            <p className="m-0 text-sm text-ink">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): {
  toast: (tone: ToastTone, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
} {
  const ctx = useContext(ToastContext);
  if (ctx === null) {
    throw new Error("useToast must be used inside <AppToastProvider>");
  }
  const { toast } = ctx;
  return {
    toast,
    success: useCallback((m: string) => toast("success", m), [toast]),
    error: useCallback((m: string) => toast("error", m), [toast]),
    info: useCallback((m: string) => toast("info", m), [toast]),
  };
}
