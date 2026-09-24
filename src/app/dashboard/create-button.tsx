"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CreateSubmissionButton({ label = "+ Nuevo levantamiento", size = "md" as const, className = "" }: { label?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/submissions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
      const text = await res.text();
      let data: { id?: string; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Respuesta inesperada del servidor: ${text.slice(0, 120)}`);
      }
      if (!res.ok) throw new Error(data.error || "No se pudo crear");
      if (!data.id) throw new Error("Respuesta sin ID");
      window.location.href = `/submissions/${data.id}`;
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <div className={className || undefined}>
      <Button onClick={handleClick} disabled={pending} size={size} variant="primary">
        {pending ? "Creando..." : label}
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
