"use client";

import * as React from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type PendingTask = { id: string; label: string; startedAt: number };

/** Tiempo mínimo visible para que el flotante se perciba (acciones rápidas). */
const MIN_VISIBLE_MS = 900;

let seq = 0;
let tasks: PendingTask[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): PendingTask[] {
  return tasks;
}

function removeTask(id: string) {
  if (!tasks.some((t) => t.id === id)) return;
  tasks = tasks.filter((t) => t.id !== id);
  emit();
}

/** Registra una tarea en curso global. Retorna el id para cerrarla. */
export function startPending(label: string): string {
  seq += 1;
  const id = `p${seq}`;
  tasks = [...tasks.slice(-2), { id, label, startedAt: Date.now() }];
  emit();
  return id;
}

export function endPending(id: string) {
  const t = tasks.find((task) => task.id === id);
  if (!t) return;
  const wait = MIN_VISIBLE_MS - (Date.now() - t.startedAt);
  if (wait <= 0) removeTask(id);
  else setTimeout(() => removeTask(id), wait);
}

/**
 * Conecta un `pending` (useActionState/useTransition/fetch) al indicador
 * flotante global. Uso: `usePendingTask(pending, "Guardando cambios…")`.
 */
export function usePendingTask(active: boolean, label: string) {
  const idRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (active && idRef.current === null) {
      idRef.current = startPending(label);
    } else if (!active && idRef.current !== null) {
      endPending(idRef.current);
      idRef.current = null;
    }
    return () => {
      if (idRef.current !== null) {
        endPending(idRef.current);
        idRef.current = null;
      }
    };
  }, [active, label]);
}

/**
 * Píldora de carga presentacional (sin store): la misma que usa el
 * flotante global. Reutilizable en `loading.tsx` (server).
 */
export function PendingPill({ label }: { label: string }) {
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none flex items-center gap-2.5 rounded-full",
        "bg-[#0f2b46] py-2.5 pr-5 pl-3.5 text-sm font-medium text-white",
        "shadow-xl shadow-slate-900/25 ring-1 ring-white/15",
        "animate-[floatIn_0.22s_ease-out]"
      )}
    >
      <Spinner className="size-4 text-sky-300" />
      <span className="line-clamp-1">{label}</span>
      <style jsx>{`
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/**
 * Botón flotante inferior-derecho: píldora con spinner por cada tarea
 * en curso. Montado una vez en el layout raíz.
 */
export function FloatingPending() {
  const pending = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (pending.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed right-4 bottom-4 z-[60] flex w-auto max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
    >
      {pending.map((t) => (
        <PendingPill key={t.id} label={t.label} />
      ))}
    </div>
  );
}
