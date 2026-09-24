"use client";

export function FormProgress({
  current,
  total = 5,
  submittedCount,
}: {
  current: number;
  total?: number;
  submittedCount: number;
}) {
  const percent = Math.round((submittedCount / total) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Sección {current} de {total}</span>
        <span className="text-sm font-semibold text-[#0f2b46]">{percent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
        <div className="h-full bg-[#0f2b46] transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-3 flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          const isSubmitted = n <= submittedCount;
          const isCurrent = n === current;
          return (
            <div
              key={n}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                isSubmitted ? "bg-emerald-500" : isCurrent ? "bg-[#0f2b46]" : "bg-slate-200"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex flex-col sm:flex-row gap-2 text-sm">
      {steps.map((label, idx) => {
        const n = idx + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li key={n} className={`flex items-center gap-2 ${active ? "font-semibold text-slate-900" : done ? "text-emerald-700" : "text-slate-500"}`}>
            <span
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs border ${
                done ? "bg-emerald-50 border-emerald-200 text-emerald-700" : active ? "bg-[#0f2b46] text-white border-[#0f2b46]" : "bg-white border-slate-200"
              }`}
            >
              {done ? "✓" : n}
            </span>
            <span className="hidden lg:inline">{label}</span>
            {idx < steps.length - 1 && <span className="hidden sm:inline text-slate-300 mx-1">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
