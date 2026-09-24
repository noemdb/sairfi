"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Props = {
  submissionId: string;
  sectionNumber: number;
  category: string;
  label: string;
  description?: string;
  accept?: string;
  multiple?: boolean;
  onUploaded?: () => void;
};

export function FileUploader({ submissionId, sectionNumber, category, label, description, accept, multiple, onUploaded }: Props) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} excede 20 MB`);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("submissionId", submissionId);
        fd.append("sectionNumber", String(sectionNumber));
        fd.append("category", category);
        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir");
      }
      const msg = files.length === 1 ? "Archivo guardado" : `${files.length} archivos guardados`;
      setSuccess("Archivo(s) registrado(s) correctamente");
      toast.success(msg, "Tu documento quedó registrado de forma segura.");
      onUploaded?.();
      // recargar para reflejar lista (mantener UX simple)
      setTimeout(() => window.location.reload(), 900);
      e.target.value = "";
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error("No se pudo subir el archivo", msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-900">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      <div className="mt-3 flex items-center gap-3">
        <label className="inline-flex">
          <span className={`inline-flex h-9 items-center rounded-xl px-4 text-sm font-medium border bg-white cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : "hover:bg-slate-50 border-slate-200"}`}>
            {uploading ? "Subiendo..." : "Seleccionar archivo(s)"}
          </span>
          <input type="file" className="hidden" accept={accept} multiple={multiple} onChange={handleChange} disabled={uploading} />
        </label>
        {accept && <span className="text-xs text-slate-500">{accept}</span>}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {success && <p className="text-sm text-emerald-700 mt-2">{success}</p>}
    </div>
  );
}

export function AttachmentList({ attachments, onDelete }: { attachments: Array<{ id: string; originalName: string; sizeBytes: number; category: string }>; onDelete?: (id: string) => void }) {
  if (attachments.length === 0) return <p className="text-sm text-slate-500">Sin archivos registrados.</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {attachments.map((a) => (
        <li key={a.id} className="flex items-center justify-between p-3 text-sm">
          <span className="truncate">
            <span className="font-medium text-slate-900">{a.originalName}</span>
            <span className="text-slate-500"> · {(a.sizeBytes / 1024).toFixed(1)} KB · {a.category}</span>
          </span>
          <span className="flex items-center gap-2 ml-3">
            <a href={`/api/files/${a.id}`} className="text-xs text-sky-700 hover:underline">
              Descargar
            </a>
            {onDelete && (
              <button onClick={() => onDelete(a.id)} className="text-xs text-red-600 hover:underline">
                Eliminar
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
