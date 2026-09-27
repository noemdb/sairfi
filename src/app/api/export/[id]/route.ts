import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/db/client";
import { auditLog } from "@/lib/auth/audit";

const SECTION_META: Record<number, { titulo: string; descripcion: string; microPasos: string[] }> = {
  1: {
    titulo: "Para qué y quién lo usará",
    descripcion:
      "Objetivo del sistema en la administración del cliente y quiénes lo usarán en el día a día (roles, permisos).",
    microPasos: ["Objetivo en administración", "Quiénes lo usan", "Permisos"],
  },
  2: {
    titulo: "Qué debe incluir tu ajuste fiscal",
    descripcion:
      "Alcance fiscal del ajuste por inflación (LISLR): procesos incluidos, partidas contables a ajustar y exclusiones.",
    microPasos: ["Alcance fiscal", "Procesos de administración", "Partidas contables"],
  },
  3: {
    titulo: "Datos, INPC y ejemplos",
    descripcion:
      "Origen de los datos, fuente y criterios del INPC, fórmulas/reglas de cálculo y mínimo 2 casos reales de cálculo.",
    microPasos: ["Origen de datos", "INPC y criterios fiscales", "2 casos reales"],
  },
  4: {
    titulo: "Informes y controles",
    descripcion:
      "Informes requeridos para la declaración (RAR, balance fiscal, conciliación), volúmenes estimados y controles (auditoría, bloqueo de períodos, multiempresa).",
    microPasos: ["Informes para declaración", "Controles", "Entrega"],
  },
  5: {
    titulo: "Documentos que ya usas",
    descripcion:
      "Soportes fiscales existentes: balances, planes de cuentas, reportes finales y lista de empresas tipo + validadores.",
    microPasos: ["Soportes fiscales", "Empresas y validación"],
  },
};

const STATUS_ES: Record<string, string> = {
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
  REVIEW: "En revisión",
  APPROVED: "Aprobado",
  ARCHIVED: "Archivado",
};

const SECTION_STATUS_ES: Record<string, string> = {
  DRAFT: "Borrador",
  SUBMITTED: "Enviado",
  REOPENED: "Reabierto",
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const rl = checkRateLimit('download', user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Límite de descargas excedido" }, { status: 429 });
  }

  const submission = await prisma.formSubmission.findUnique({
    where: { id },
    include: {
      user: { include: { roles: { include: { role: true } } } },
      sections: { include: { cases: true }, orderBy: { sectionNumber: "asc" } },
      attachments: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!submission) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (user.role !== "ADMIN" && submission.userId !== user.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Auditoría de descarga (D-M4: toda exportación se registra)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;
  const ua = req.headers.get("user-agent") || undefined;
  await auditLog({
    userId: user.id,
    action: "FILE_DOWNLOADED",
    entity: "FormSubmission",
    entityId: id,
    submissionId: id,
    metadata: { format: "sairfi/levantamiento-json", version: "1.0" },
    ipAddress: ip,
    userAgent: ua,
  });

  const submittedCount = submission.sections.filter((s) => s.status === "SUBMITTED").length;
  const totalSections = 5;
  const exportedAt = new Date();

  const secciones = submission.sections.map((s) => {
    const meta = SECTION_META[s.sectionNumber] ?? {
      titulo: `Sección ${s.sectionNumber}`,
      descripcion: "",
      microPasos: [],
    };
    return {
      numero: s.sectionNumber,
      titulo: meta.titulo,
      descripcion: meta.descripcion,
      microPasos: meta.microPasos,
      estado: s.status,
      estadoDescripcion: SECTION_STATUS_ES[s.status] ?? s.status,
      version: s.version,
      enviadoEn: s.submittedAt,
      actualizadoEn: s.updatedAt,
      // Respuestas tal cual las capturó el formulario (claves por sección, ver section-client.tsx)
      respuestas: (s.answers ?? {}) as Record<string, unknown>,
      // Casos normalizados (sección 3). En BD también viven dentro de answers.cases para borradores.
      casosCalculo: s.cases
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          posicion: c.position,
          tipoCaso: c.caseType,
          otroTipoCaso: c.otherCaseType,
          identificador: c.identifier,
          saldosIniciales: c.initialBalances,
          fecha: c.date,
          inpc: String(c.inpc),
          movimientos: c.movements,
          resultadoEsperado: c.expectedResult,
          explicacionRegla: c.ruleExplanation,
        })),
    };
  });

  const adjuntos = submission.attachments.map((a) => ({
    id: a.id,
    seccion: a.sectionNumber,
    seccionTitulo: SECTION_META[a.sectionNumber]?.titulo ?? null,
    categoria: a.category,
    nombreOriginal: a.originalName,
    tipoMime: a.mimeType,
    extension: a.extension,
    tamanoBytes: a.sizeBytes,
    subidoEn: a.createdAt,
    urlDescarga: `/api/files/${a.id}`,
    casoCalculoId: a.calculationCaseId,
  }));

  const adjuntosPorSeccion: Record<string, number> = {};
  for (const a of adjuntos) {
    const k = `seccion_${a.seccion}`;
    adjuntosPorSeccion[k] = (adjuntosPorSeccion[k] ?? 0) + 1;
  }

  // Estructura pensada para que un agente entienda el levantamiento integral sin conocer el schema interno.
  const data = {
    _meta: {
      formato: "sairfi/levantamiento-ajuste-inflacion-fiscal",
      version: "1.0",
      generadoEn: exportedAt,
      generadoPor: { email: user.email, rol: user.role },
      proposito:
        "Levantamiento de requerimientos para el Sistema de ajuste por inflación fiscal inicial y regulares (LISLR Venezuela: ajuste inicial + reajustes regulares, INPC, RAR, balance fiscal).",
      idioma: "es-VE",
      comoLeer:
        "Recorre 'secciones' en orden (1-5). Cada sección trae titulo, descripcion, estado y respuestas. 'casosCalculo' en sección 3 son los ejemplos de cálculo validados. 'adjuntos' lista los soportes con su urlDescarga. 'resumenAgente' es un resumen textual listo para contexto de LLM.",
    },
    levantamiento: {
      id: submission.id,
      titulo: submission.title,
      estado: submission.status,
      estadoDescripcion: STATUS_ES[submission.status] ?? submission.status,
      seccionActual: submission.currentSection,
      creadoEn: submission.createdAt,
      actualizadoEn: submission.updatedAt,
      enviadoEn: submission.submittedAt,
      completadoEn: submission.completedAt,
    },
    respondente: {
      nombre: submission.user.name,
      email: submission.user.email,
      roles: submission.user.roles.map((r) => r.role.nombre),
    },
    progreso: {
      seccionesEnviadas: submittedCount,
      seccionesTotales: totalSections,
      porcentaje: Math.round((submittedCount / totalSections) * 100),
      seccionesPendientes: secciones.filter((s) => s.estado !== "SUBMITTED").map((s) => s.numero),
    },
    secciones,
    adjuntos,
    resumenAgente: {
      texto: [
        `Levantamiento "${submission.title}" (${STATUS_ES[submission.status] ?? submission.status}, ${submittedCount}/${totalSections} secciones enviadas).`,
        ...secciones.map((s) => {
          const nResp = Object.keys(s.respuestas ?? {}).length;
          return `S${s.numero} "${s.titulo}" [${s.estadoDescripcion}]: ${nResp} campos respondidos${s.casosCalculo.length ? `, ${s.casosCalculo.length} casos de cálculo` : ""}.`;
        }),
        `Adjuntos: ${adjuntos.length} archivo(s)${adjuntos.length ? ` (${adjuntos.map((a) => `${a.nombreOriginal} [S${a.seccion}/${a.categoria}]`).join("; ")})` : ""}.`,
      ].join(" "),
      conteoRespuestasPorSeccion: Object.fromEntries(secciones.map((s) => [`seccion_${s.numero}`, Object.keys(s.respuestas ?? {}).length])),
      casosCalculoTotal: secciones.reduce((acc, s) => acc + s.casosCalculo.length, 0),
      adjuntosPorSeccion,
    },
    // Compatibilidad con consumidores existentes (admin Exportar JSON)
    submission: {
      id: submission.id,
      title: submission.title,
      status: submission.status,
      currentSection: submission.currentSection,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      completedAt: submission.completedAt,
      user: { email: submission.user.email, name: submission.user.name, roles: submission.user.roles.map((r) => r.role.nombre) },
    },
    sections: submission.sections.map((s) => ({
      sectionNumber: s.sectionNumber,
      status: s.status,
      answers: s.answers,
      submittedAt: s.submittedAt,
      version: s.version,
      cases: s.cases.map((c) => ({
        position: c.position,
        caseType: c.caseType,
        otherCaseType: c.otherCaseType,
        identifier: c.identifier,
        initialBalances: c.initialBalances,
        date: c.date,
        inpc: String(c.inpc),
        movements: c.movements,
        expectedResult: c.expectedResult,
        ruleExplanation: c.ruleExplanation,
      })),
    })),
    attachments: submission.attachments.map((a) => ({
      id: a.id,
      sectionNumber: a.sectionNumber,
      category: a.category,
      originalName: a.originalName,
      mimeType: a.mimeType,
      extension: a.extension,
      sizeBytes: a.sizeBytes,
      createdAt: a.createdAt,
    })),
  };

  return NextResponse.json(data, {
    headers: { "Content-Disposition": `attachment; filename="levantamiento-${id}.json"` },
  });
}
