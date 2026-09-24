"use client";
import * as React from "react";

export function FieldHelp({
  title = "¿Cómo responder?",
  example,
  tip,
  children,
}: {
  title?: string;
  example?: string;
  tip?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-[#0f2b46] hover:text-[#1e4a7a] transition-colors"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full border border-slate-300 bg-white text-[10px]">?</span>
        {title}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-xs leading-5 text-slate-600">
          {children && <div className="mb-1.5">{children}</div>}
          {example && (
            <div className="rounded-lg bg-white border border-slate-200 px-2.5 py-2 font-mono text-[11.5px] leading-5 text-slate-700">
              Ej.: {example}
            </div>
          )}
          {tip && <p className="mt-1.5 text-[11.5px] leading-5 text-slate-500">💡 {tip}</p>}
        </div>
      )}
    </div>
  );
}

export function ExampleBox({ label = "Ejemplo", children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-widest text-slate-500">{label.toUpperCase()}</p>
      <div className="mt-1 text-xs leading-5 text-slate-700">{children}</div>
    </div>
  );
}

export function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5 text-xs leading-5 text-slate-700">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white border border-sky-200 text-sky-700">i</span>
      <span>{children}</span>
    </div>
  );
}
