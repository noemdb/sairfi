import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { buildTemplate } from "@/lib/domain/imports";

type Ctx = { params: Promise<{ tipo: string }> };

/** Plantilla oficial .xlsx (solo cabecera) para partidas o movimientos. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { tipo } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado" } }, { status: 401 });
  }
  if (!hasPermission(user.roles, "imports", "read")) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "No autorizado" } }, { status: 403 });
  }
  if (tipo !== "items" && tipo !== "movements") {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Plantilla items o movements" } },
      { status: 404 },
    );
  }
  const xlsx = buildTemplate(tipo === "items" ? "FISCAL_ITEMS" : "FISCAL_MOVEMENTS");
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plantilla-${tipo}.xlsx"`,
    },
  });
}
