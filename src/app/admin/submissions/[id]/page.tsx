import { redirect } from "next/navigation";

// Compatibilidad: la gestión de levantamientos vive en /admin/levantamiento.
export default async function AdminSubmissionDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/levantamiento/${id}`);
}
