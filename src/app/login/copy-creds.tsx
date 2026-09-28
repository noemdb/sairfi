"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const CREDS = [
  { label: "Email", value: "cliente@test.com" },
  { label: "Contraseña", value: "cliente@test.com" },
];

/** Filas de credenciales demo con copiar al portapapeles. */
export function CopyCreds() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(value);
    setTimeout(() => setCopied((c) => (c === value ? null : c)), 1600);
  }

  return (
    <div className="grid gap-2 text-sm">
      {CREDS.map((c) => {
        const done = copied === c.value;
        return (
          <button
            key={c.label}
            type="button"
            onClick={() => copy(c.value)}
            title="Haz clic para copiar"
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left",
              "border-slate-200 bg-white shadow-sm transition-colors",
              "hover:border-[#0f2b46]/25 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-500"
            )}
          >
            <span className="text-xs font-medium text-slate-500">{c.label}</span>
            <span className="flex items-center gap-2">
              <code className="font-mono text-sm font-medium text-slate-900 select-all">{c.value}</code>
              {done ? (
                <Check className="size-4 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="size-4 text-slate-400" aria-hidden />
              )}
            </span>
          </button>
        );
      })}
      <p className="text-center text-xs font-medium text-emerald-700">
        {copied ? "¡Copiado! Pega y entra." : "Haz clic para copiar · Pega y entra · Así de simple"}
      </p>
    </div>
  );
}
