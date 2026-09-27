import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/auth/audit";
import { buildReportData, ReportConflictError } from "@/lib/domain/reports";
import { balanceCSV, balancePDF, balanceXLSX } from "@/lib/reports/balance";
import { worksheetCSV, worksheetPDF, worksheetXLSX } from "@/lib/reports/worksheet";
import { consolidadoCSV, consolidadoPDF, consolidadoXLSX } from "@/lib/reports/consolidado";
import type { ReportData } from "@/lib/reports/common";

const REPORTS = ["balance", "worksheet", "consolidado"] as const;
const FORMATS = ["xlsx", "pdf", "csv"] as const;
type Report = (typeof REPORTS)[number];
type Format = (typeof FORMATS)[number];

const MIME: Record<Format, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  csv: "text/csv; charset=utf-8",
};

type Ctx = { params: Promise<{ id: string; report: string; format: string }> };

/**
 * Exporta un cálculo APROBADO en 3 reportes × 3 formatos, con metadatos
 * (fecha, usuario, versiones) y descarga auditada.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id, report, format } = await params;
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado" } }, { status: 401 });
  if (!hasPermission(user.roles, "calculations", "read"))
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "No autorizado" } }, { status: 403 });
  if (!REPORTS.includes(report as Report) || !FORMATS.includes(format as Format)) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Reporte o formato inexistente" } }, { status: 404 });
  }
  try {
    const data = await buildReportData(
      id,
      { userId: user.id, isAdmin: user.roles.includes("administrador") },
      user,
    );
    type Emitter = (data: ReportData) => Buffer | string | Promise<Buffer>;
    const builders: Record<Report, Record<Format, Emitter>> = {
      balance: { xlsx: balanceXLSX, pdf: balancePDF, csv: balanceCSV },
      worksheet: { xlsx: worksheetXLSX, pdf: worksheetPDF, csv: worksheetCSV },
      consolidado: { xlsx: consolidadoXLSX, pdf: consolidadoPDF, csv: consolidadoCSV },
    };
    const out = await builders[report as Report][format as Format](data);
    const body = typeof out === "string" ? out : new Uint8Array(out);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "FILE_DOWNLOADED",
      entity: "AdjustmentCalculation",
      entityId: id,
      metadata: { report, format } as never,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return new NextResponse(body, {
      headers: {
        "Content-Type": MIME[format as Format],
        "Content-Disposition": `attachment; filename="${report}-${id.slice(0, 8)}.${format}"`,
      },
    });
  } catch (e) {
    if (e instanceof ReportConflictError) {
      const notFound = e.message.includes("no encontrado");
      return NextResponse.json(
        { error: { code: notFound ? "NOT_FOUND" : "CONFLICT", message: e.message } },
        { status: notFound ? 404 : 409 },
      );
    }
    throw e;
  }
}
