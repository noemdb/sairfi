"use client";

import * as React from "react";
import { FileUp, FileCheck2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

/**
 * Zona de subida con drag-and-drop + explorador, estilo shadcn Field.
 * Mantiene un `<input type="file" name>` real para que el submit del
 * form (FormData) funcione sin cambios.
 */
export function FileDropzone({
  id,
  name,
  label,
  description,
  accept = ".csv",
  required,
  maxSizeMB = 10,
  onFile,
}: {
  id: string;
  name: string;
  label: string;
  description?: string;
  accept?: string;
  required?: boolean;
  maxSizeMB?: number;
  /** Notifica el archivo válido seleccionado (o null al quitarlo) para vistas previas. */
  onFile?: (file: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileSize, setFileSize] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const dragCount = React.useRef(0);

  const allowed = React.useMemo(
    () => accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
    [accept]
  );

  const applyFile = React.useCallback(
    (file: File | undefined) => {
      setError(null);
      if (!file) {
        onFile?.(null);
        return;
      }
      if (!allowed.includes(extOf(file.name))) {
        setError(`Solo archivos ${allowed.join(", ")}`);
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`El archivo excede ${maxSizeMB} MB`);
        return;
      }
      if (file.size === 0) {
        setError("Archivo vacío");
        return;
      }
      const dt = new DataTransfer();
      dt.items.add(file);
      if (inputRef.current) inputRef.current.files = dt.files;
      setFileName(file.name);
      setFileSize(formatBytes(file.size));
      onFile?.(file);
    },
    [allowed, maxSizeMB, onFile]
  );

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setFileName(null);
    setFileSize(null);
    setError(null);
    onFile?.(null);
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(e) => applyFile(e.target.files?.[0])}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dragCount.current += 1;
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragCount.current = Math.max(0, dragCount.current - 1);
          if (dragCount.current === 0) setDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          dragCount.current = 0;
          setDragging(false);
          applyFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          dragging
            ? "border-sky-500 bg-sky-50"
            : fileName
              ? "border-emerald-300 bg-emerald-50/50"
              : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-50"
        )}
      >
        {fileName ? (
          <>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700">
              <FileCheck2 className="size-5" aria-hidden />
            </span>
            <span className="flex max-w-full items-center gap-2 text-sm font-medium text-slate-900">
              <span className="min-w-0 truncate">{fileName}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                }}
                aria-label={`Quitar ${fileName}`}
                className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
            {fileSize && <span className="text-xs text-slate-500 tabular-nums">{fileSize} · clic para cambiar</span>}
          </>
        ) : (
          <>
            <span
              className={cn(
                "grid h-10 w-10 place-items-center rounded-2xl transition-colors",
                dragging ? "bg-sky-500/15 text-sky-700" : "bg-white text-slate-400 shadow-sm"
              )}
            >
              <FileUp className="size-5" aria-hidden />
            </span>
            <span className="text-sm font-medium text-slate-700">
              {dragging ? "Suelta el archivo aquí" : "Arrastra el archivo o haz clic para buscarlo"}
            </span>
            <span className="text-xs text-slate-500">
              {allowed.join(", ")} · máx. {maxSizeMB} MB
            </span>
          </>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-normal text-red-600">{error}</p>
      ) : (
        description && <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  );
}
