"use client";
import { useState } from "react";

export function DownloadSubmissionButton({ submissionId, title }: { submissionId: string; title?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/export/${submissionId}`, { credentials: "include" });
      if (!res.ok) {
        let msg = "No se pudo descargar";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          /* respuesta no JSON */
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `levantamiento-${submissionId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={handleDownload}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 hover:border-sky-300 transition-colors disabled:opacity-60 disabled:cursor-wait"
        title="Descargar datos del levantamiento en JSON estructurado (apto para agentes/IA)"
        aria-label={`Descargar JSON del levantamiento ${title || ""}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {pending ? "Descargando..." : "JSON"}
      </button>
      {error && (
        <span className="text-[11px] font-medium text-red-600" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
