"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiModo = "compacto" | "exacto";

const KEY = "sairfi-kpi-modo";

/**
 * Alcance + interruptor de vista de cifras del dashboard.
 * Envuelve la retícula de KPIs: `data-kpi-mode` conmuta entre la cifra
 * grande abreviada (M/MM) y la exacta (ver reglas en `globals.css`).
 * La preferencia se guarda en el navegador de cada usuario.
 */
export function KpiDisplay({ children }: { children: React.ReactNode }) {
  // Inicializador perezoso: en servidor siempre "compacto" (coincide con el
  // HTML servido); en cliente lee la preferencia guardada sin effects.
  const [modo, setModo] = useState<KpiModo>(() => {
    if (typeof window === "undefined") return "compacto";
    try {
      return localStorage.getItem(KEY) === "exacto" ? "exacto" : "compacto";
    } catch {
      return "compacto";
    }
  });

  function cambiar(m: KpiModo) {
    setModo(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* almacenamiento no disponible: la vista sigue funcionando en sesión */
    }
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-end gap-2">
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Scale className="size-3.5" aria-hidden />
          Vista de cifras
        </span>
        <div
          role="group"
          aria-label="Vista de cifras: compacta o exacta"
          className="flex rounded-full border border-slate-200 bg-white p-0.5 shadow-sm"
        >
          {(["compacto", "exacto"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={modo === m}
              onClick={() => cambiar(m)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                modo === m ? "bg-[#0f2b46] text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              {m === "compacto" ? "Compacta" : "Exacta"}
            </button>
          ))}
        </div>
      </div>
      <div data-kpi-mode={modo} className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </>
  );
}
