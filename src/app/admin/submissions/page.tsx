import { redirect } from "next/navigation";

// Compatibilidad: la gestión de levantamientos vive en /admin/levantamiento.
export default function AdminSubmissionsRedirect() {
  redirect("/admin/levantamiento");
}
