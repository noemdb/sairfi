"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteSubmissionAction } from "@/actions/submissions";

export function DeleteSubmissionButton({ submissionId, title }: { submissionId: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await deleteSubmissionAction(submissionId);
        if (!res.ok) throw new Error(res.error || "No se pudo eliminar");
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
        title="Eliminar levantamiento y comenzar desde cero"
        aria-label={`Eliminar levantamiento ${title || ""}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        Reiniciar
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <span className="h-9 w-9 shrink-0 rounded-full bg-red-100 text-red-600 grid place-items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.3 3.3 3.6 14.9a2 2 0 0 0 1.7 2.9h13.4a2 2 0 0 0 1.7-2.9L13.7 3.3a2 2 0 0 0-3.4 0Z" />
                </svg>
              </span>
              <div>
                <DialogTitle id="reset-title">¿Reiniciar levantamiento?</DialogTitle>
                <DialogDescription>
                  Estás por eliminar <span className="font-medium text-slate-900">{title || "este levantamiento"}</span> y todos sus datos: respuestas, secciones y archivos. Podrás comenzar uno nuevo desde cero.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-5 text-amber-800">
              Esta acción no se puede deshacer. Se borrarán de forma permanente las 5 secciones y los documentos asociados.
            </div>
            {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending} className="sm:mr-auto">
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleDelete}
              disabled={pending}
              className="bg-red-600 hover:bg-red-700 border-red-600 text-white shadow-sm"
            >
              {pending ? "Borrando..." : "Sí, borrar y reiniciar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
