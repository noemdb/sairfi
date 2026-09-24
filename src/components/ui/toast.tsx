"use client";
import * as React from "react";

type Variant = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant: Variant;
};

type ToastContextValue = {
  toast: (opts: { title: string; description?: string; variant?: Variant }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const remove = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = React.useCallback(
    (opts: { title: string; description?: string; variant?: Variant }) => {
      const id = Math.random().toString(36).slice(2, 9);
      const toast: Toast = { id, title: opts.title, description: opts.description, variant: opts.variant || "info" };
      setToasts((prev) => [...prev, toast]);
      // auto-dismiss 4.5s (5.5s para error)
      const ttl = toast.variant === "error" ? 5500 : 4500;
      setTimeout(() => remove(id), ttl);
    },
    [remove]
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast: add,
      success: (title, description) => add({ title, description, variant: "success" }),
      error: (title, description) => add({ title, description, variant: "error" }),
      info: (title, description) => add({ title, description, variant: "info" }),
      warning: (title, description) => add({ title, description, variant: "warning" }),
    }),
    [add]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToasterStack toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

function ToasterStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic={false}
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 w-[92vw] max-w-[380px] pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const variantStyles: Record<Variant, string> = {
    success: "border-emerald-200 bg-white shadow-[0_8px_24px_rgba(16,185,129,0.12)]",
    error: "border-red-200 bg-white shadow-[0_8px_24px_rgba(239,68,68,0.12)]",
    info: "border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,43,70,0.10)]",
    warning: "border-amber-200 bg-white shadow-[0_8px_24px_rgba(245,158,11,0.12)]",
  };

  const icon: Record<Variant, string> = {
    success: "✓",
    error: "!",
    info: "i",
    warning: "!",
  };

  const iconBg: Record<Variant, string> = {
    success: "bg-emerald-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-[#0f2b46] text-white",
    warning: "bg-amber-500 text-white",
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto flex gap-3 rounded-2xl border px-4 py-3 ${variantStyles[toast.variant]} animate-[toastIn_0.22s_ease-out]`}
    >
      <span className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${iconBg[toast.variant]}`}>
        {icon[toast.variant]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-5 text-slate-900">{toast.title}</p>
        {toast.description && <p className="mt-1 text-sm leading-5 text-slate-600">{toast.description}</p>}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="shrink-0 -mr-1 -mt-1 h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
      >
        ×
      </button>
      <style jsx>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// Fallback hook para usar sin provider (no rompe si se olvida)
export function useToastOptional() {
  const ctx = React.useContext(ToastContext);
  return ctx;
}
