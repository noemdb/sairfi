"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Label, FieldError, HelpText } from "@/components/ui/input";
import { FormProgress, Stepper } from "@/components/form/progress";
import { FileUploader, AttachmentList } from "@/components/form/file-uploader";
import { saveDraftAction, submitSectionAction } from "@/actions/sections";
import { deleteAttachmentAction } from "@/actions/attachments";
import { useToast } from "@/components/ui/toast";

const steps = ["Objetivo y usuario", "Alcance tributario", "Datos y cálculo", "Reportes y entrega", "Material adjunto"];

const USER_TYPES = ["Administrador", "Analista contable", "Contador", "Asesor tributario", "Supervisor", "Cliente final", "Auditor", "Otro"] as const;
const SCOPE_OPTIONS = ["Solo ajuste fiscal LISLR", "Ajuste fiscal y contable/financiero", "No estoy seguro", "Otro"] as const;
const PROCESS_OPTIONS = ["Ajuste inicial", "Reajuste regular anual", "RAR", "Cálculo de obligaciones asociadas", "Depreciación/amortización fiscal", "Movimientos de patrimonio", "Altas y bajas de activos", "Inventarios", "Pasivos no monetarios", "Conciliación fiscal", "Exportación ISLR", "Otro"] as const;
const PARTIDA_OPTIONS = ["Activos fijos", "Inventarios", "Inmuebles", "Intangibles", "Inversiones", "Construcción en proceso", "Deudas de largo plazo", "Capital social", "Reservas", "Resultados acumulados", "Aportes", "Dividendos", "Otro"] as const;
const ORIGINS = ["Carga manual", "Excel/CSV", "Sistema administrativo-contable", "API", "Archivos exportados", "Otro"] as const;
const INPC_OPTS = ["Carga manual", "Importación desde Excel", "Fuente externa", "Validación por administrador", "Otro"] as const;
const REPORTS = ["Hoja detallada de cálculo por partida", "Balance General Fiscal Actualizado", "RAR", "Conciliación fiscal", "Resumen para declaración ISLR", "Asiento contable sugerido", "Expediente por empresa/período", "Informe PDF", "Exportación Excel/CSV", "Formatos específicos para clientes/contadores/SENIAT", "Otro"] as const;

const TEST_CASE_1: Record<string, string> = {
  caseType: "Ajuste inicial",
  otherCaseType: "",
  identifier: "Caso 01 — Ajuste inicial (ejemplo)",
  initialBalances: "Activos fijos: 1.250.000,00 Bs · Inventarios: 480.000,00 Bs · Capital social: 800.000,00 Bs · Resultados acumulados: 150.000,00 Bs",
  date: "2024-12-31",
  inpc: "450.1234",
  movements: "Alta de maquinaria el 15/03/2024 por 120.000,00 Bs. Baja por venta de equipo el 22/07/2024. Inventario inicial ajustado al cierre.",
  expectedResult: "Incremento neto por ajuste inicial: 312.500,00 Bs. Patrimonio fiscal ajustado: 1.242.500,00 Bs. RAR preliminar: 312.500,00 Bs.",
  ruleExplanation: "Factor = INPC cierre (450,1234) / INPC origen. Se aplica art. 173 LISLR con INPC a 4 decimales (Decimal 20,4). Información declarativa, sin interpretación automática.",
};

const TEST_CASE_2: Record<string, string> = {
  caseType: "Reajuste con aumento neto de patrimonio",
  otherCaseType: "",
  identifier: "Caso 02 — Reajuste con aumento neto (ejemplo)",
  initialBalances: "Patrimonio fiscal inicial: 1.242.500,00 Bs · RAR acumulado: 312.500,00 Bs · Activos fijos netos: 1.370.000,00 Bs",
  date: "2024-12-31",
  inpc: "480.5600",
  movements: "Aumento de capital en 10/06/2024 por 200.000,00 Bs. Exclusión de partidas no monetarias. Actualización por INPC del período.",
  expectedResult: "Reajuste neto por aumento: 98.750,00 Bs. Patrimonio fiscal reajustado: 1.541.250,00 Bs. RAR actualizado: 411.250,00 Bs.",
  ruleExplanation: "Reajuste anual = (Patrimonio inicial + aumentos - disminuciones) × (INPC cierre / INPC inicio) - patrimonio inicial. INPC con 4 decimales, redondeo controlado.",
};

const EMPTY_CASE: Record<string, string> = {
  caseType: "Reajuste con aumento neto de patrimonio",
  otherCaseType: "",
  identifier: "",
  initialBalances: "",
  date: "",
  inpc: "",
  movements: "",
  expectedResult: "",
  ruleExplanation: "",
};

type Props = {
  submissionId: string;
  sectionNumber: number;
  initialAnswers: Record<string, unknown>;
  status: string;
  submittedCount: number;
  currentSection: number;
  attachments: Array<{ id: string; originalName: string; sizeBytes: number; category: string; sectionNumber: number }>;
  initialCases: Array<Record<string, unknown>>;
  canEdit: boolean;
};

export function SectionClient({ submissionId, sectionNumber, initialAnswers, status, submittedCount, attachments, initialCases }: Props) {
  const toast = useToast();
  const [saving, startSaving] = useTransition();
  const [submitting, startSubmitting] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issueList, setIssueList] = useState<Array<{ path: string; message: string; pretty: string }>>([]);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Form states
  // S1
  const [s1, setS1] = useState(() => ({
    objective: (initialAnswers.objective as string) || "",
    userTypes: (initialAnswers.userTypes as string[]) || [],
    otherUserType: (initialAnswers.otherUserType as string) || "",
    permissions: (initialAnswers.permissions as string) || "",
  }));
  // S2
  const [s2, setS2] = useState(() => ({
    scope: (initialAnswers.scope as string) || "",
    scopeSeparation: (initialAnswers.scopeSeparation as string) || "",
    otherScope: (initialAnswers.otherScope as string) || "",
    processes: (initialAnswers.processes as string[]) || [],
    otherProcess: (initialAnswers.otherProcess as string) || "",
    partidas: (initialAnswers.partidas as string[]) || [],
    otherPartida: (initialAnswers.otherPartida as string) || "",
    exclusions: (initialAnswers.exclusions as string) || "",
  }));
  // S3 - precarga 2 casos: ambos con datos de prueba válidos
  const [s3, setS3] = useState(() => {
    const existing = (initialCases.length > 0 ? initialCases : (initialAnswers.cases as Array<Record<string, unknown>>) || []) as Array<Record<string, string>>;
    if (existing.length === 0) return {
      dataOrigins: ((initialAnswers.dataOrigins as string[]) && (initialAnswers.dataOrigins as string[]).length > 0 ? (initialAnswers.dataOrigins as string[]) : ["Carga manual"]),
      otherOrigin: (initialAnswers.otherOrigin as string) || "",
      systems: (initialAnswers.systems as string) || "",
      inpcSource: (initialAnswers.inpcSource as string) || "Carga manual",
      inpcSourceUrl: (initialAnswers.inpcSourceUrl as string) || "",
      otherInpcSource: (initialAnswers.otherInpcSource as string) || "",
      inpcApprover: (initialAnswers.inpcApprover as string) || "Contador General (demo)",
      criteria: (initialAnswers.criteria as string) || "Criterio de prueba: Factor = INPC cierre / INPC origen aplicado a partidas no monetarias según LISLR Art. 173, con INPC a 4 decimales y control de redondeo. Texto supera 50 caracteres para validación.",
      cases: [TEST_CASE_1, TEST_CASE_2],
    };
    return {
      dataOrigins: (initialAnswers.dataOrigins as string[]) || [],
      otherOrigin: (initialAnswers.otherOrigin as string) || "",
      systems: (initialAnswers.systems as string) || "",
      inpcSource: (initialAnswers.inpcSource as string) || "",
      inpcSourceUrl: (initialAnswers.inpcSourceUrl as string) || "",
      otherInpcSource: (initialAnswers.otherInpcSource as string) || "",
      inpcApprover: (initialAnswers.inpcApprover as string) || "",
      criteria: (initialAnswers.criteria as string) || "",
      cases: existing,
    };
  });
  // S4
  const [s4, setS4] = useState(() => ({
    reports: (initialAnswers.reports as string[]) || [],
    reportFormatsDetail: (initialAnswers.reportFormatsDetail as string) || "",
    otherReport: (initialAnswers.otherReport as string) || "",
    estimatedCompanies: (initialAnswers.estimatedCompanies as string | number) ?? "",
    estimatedUsers: (initialAnswers.estimatedUsers as string | number) ?? "",
    historicalYears: (initialAnswers.historicalYears as string | number) ?? "",
    assetVolume: (initialAnswers.assetVolume as string) || "",
    multiCompany: (initialAnswers.multiCompany as boolean) ?? false,
    auditTrail: (initialAnswers.auditTrail as boolean) ?? false,
    periodLock: (initialAnswers.periodLock as boolean) ?? false,
    reviewFlow: (initialAnswers.reviewFlow as string) || "",
    backup: (initialAnswers.backup as boolean) ?? false,
    permissionsDetail: (initialAnswers.permissionsDetail as string) || "",
    availability: (initialAnswers.availability as string) || "",
    deployment: (initialAnswers.deployment as string) || "Web",
    language: (initialAnswers.language as string) || "Español",
    otherLanguage: (initialAnswers.otherLanguage as string) || "",
    currency: (initialAnswers.currency as string) || "VES",
    otherCurrency: (initialAnswers.otherCurrency as string) || "",
    rounding: (initialAnswers.rounding as string) || "",
    budget: (initialAnswers.budget as string) || "",
    targetDate: (initialAnswers.targetDate as string) || "",
    deliveryPhases: (initialAnswers.deliveryPhases as string) || "",
  }));
  // S5
  const [s5, setS5] = useState(() => ({
    companyListText: (initialAnswers.companyListText as string) || "",
    validators: (initialAnswers.validators as string) || "",
  }));

  const isReadOnly = status === "SUBMITTED";

  function buildAnswers(): unknown {
    switch (sectionNumber) {
      case 1:
        return s1;
      case 2:
        return s2;
      case 3:
        return s3;
      case 4:
        return s4;
      case 5:
        return s5;
      default:
        return {};
    }
  }

  function handleSaveDraft() {
    setDraftStatus("saving");
    startSaving(async () => {
      const ans = buildAnswers();
      const res = await saveDraftAction(submissionId, sectionNumber, ans);
      if (res.ok) {
        setDraftStatus("saved");
        setMessage(res.message || "Borrador guardado");
        toast.success("Borrador guardado", "Tu avance quedó seguro. Puedes volver cuando quieras.");
        setTimeout(() => setDraftStatus("idle"), 2000);
      } else {
        setDraftStatus("error");
        setMessage(res.message || "Error al guardar");
        toast.error("No se pudo guardar", res.message || "Verifica tu conexión e inténtalo nuevamente.");
      }
    });
  }

  function handleSubmit() {
    setErrors({});
    setIssueList([]);
    setMessage(null);
    startSubmitting(async () => {
      const ans = buildAnswers();
      const res = await submitSectionAction(submissionId, sectionNumber, ans);
      if (res.ok) {
        const msg = res.message || `Gracias. Sección ${sectionNumber} recibida.`;
        setMessage(msg);
        setIssueList([]);
        toast.success(msg, "Tu información quedó guardada correctamente. Puedes continuar con la siguiente sección.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const issues = (res.issues || []) as Array<{ path: (string | number)[]; message: string }>;
        const map: Record<string, string> = {};
        const list: Array<{ path: string; message: string; pretty: string }> = [];
        issues.forEach((iss) => {
          const key = iss.path.join(".");
          map[key] = iss.message;
          const pretty = prettyLabel(iss.path);
          list.push({ path: key, message: iss.message, pretty });
        });
        setErrors(map);
        setIssueList(list);

        const isGeneric = !res.message || res.message === "Validación fallida" || res.message === "Revisa los campos marcados";
        const title = isGeneric && list.length > 0 ? `Faltan ${list.length} campos por completar` : res.message || "Revisa los campos marcados";

        setMessage(title);
        if (list.length > 0) {
          // Toast principal con campo específico
          toast.warning(title, `${list[0].pretty}: ${list[0].message}`);
          list.slice(1, 3).forEach((it) => toast.error(`${it.pretty}: ${it.message}`));
        } else {
          toast.error("Revisa la información", title);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  // Helpers
  function prettyLabel(path: (string | number)[]): string {
    if (path[0] === "cases" && typeof path[1] === "number") {
      const n = Number(path[1]) + 1;
      const field = String(path[2] || "");
      const map: Record<string, string> = {
        caseType: "Tipo de caso",
        otherCaseType: "Especifique tipo de caso",
        identifier: "Nombre o identificador",
        initialBalances: "Saldos iniciales",
        date: "Fecha",
        inpc: "INPC",
        movements: "Movimientos",
        expectedResult: "Resultado esperado",
        ruleExplanation: "Explicación de la regla aplicada",
      };
      return `Caso ${n} · ${map[field] || field}`;
    }
    const topMap: Record<string, string> = {
      objective: "Objetivo principal",
      userTypes: "Tipos de usuario",
      otherUserType: "Especifique otro tipo de usuario",
      permissions: "Permisos por tipo de usuario",
      scope: "Alcance del ajuste",
      scopeSeparation: "Separación de cálculos, libros y reportes",
      otherScope: "Especifique otro alcance",
      processes: "Procesos incluidos",
      otherProcess: "Especifique otro proceso",
      partidas: "Tipos de partidas",
      otherPartida: "Especifique otro tipo de partida",
      exclusions: "Partidas que deben excluirse",
      dataOrigins: "Origen de los datos",
      otherOrigin: "Especifique otro origen",
      systems: "Sistemas intervinientes",
      inpcSource: "Fuente oficial del INPC",
      inpcSourceUrl: "URL o API de la fuente",
      otherInpcSource: "Especifique otra fuente",
      inpcApprover: "Responsable de aprobar los índices INPC",
      criteria: "Criterios, fórmulas y reglas de cálculo",
      cases: "Casos de cálculo",
      reports: "Reportes requeridos",
      reportFormatsDetail: "Detalle de formatos específicos",
      otherReport: "Especifique otro reporte",
      estimatedCompanies: "Cantidad estimada de empresas",
      estimatedUsers: "Cantidad estimada de usuarios",
      historicalYears: "Años históricos a cargar",
      assetVolume: "Volumen de activos y movimientos",
      multiCompany: "Operación multiempresa",
      auditTrail: "Auditoría de cambios",
      periodLock: "Bloqueo de períodos cerrados",
      reviewFlow: "Flujo de revisión y aprobación",
      backup: "Respaldo de documentos",
      permissionsDetail: "Permisos",
      availability: "Disponibilidad requerida",
      deployment: "Despliegue",
      language: "Idioma",
      otherLanguage: "Especifique idioma",
      currency: "Moneda",
      otherCurrency: "Especifique moneda",
      rounding: "Redondeos",
      deliveryPhases: "Fases de entrega",
      companyListText: "Lista de empresas tipo",
      validators: "Personas que validarán los resultados",
    };
    return topMap[String(path[0])] || String(path[0]);
  }

  function toggleArray(set: (v: string[]) => void, arr: string[], value: string) {
    if (arr.includes(value)) set(arr.filter((x) => x !== value));
    else set([...arr, value]);
  }

  const sectionMeta = [
    { title: "Objetivo y usuario", purpose: "Recopilar el objetivo del sistema y los perfiles/permisos de usuario." },
    { title: "Alcance tributario y contable", purpose: "Definir alcance fiscal/contable, procesos y partidas." },
    { title: "Datos y cálculo", purpose: "Definir origen de datos, INPC, criterios y casos de cálculo." },
    { title: "Reportes, controles y entrega", purpose: "Definir reportes requeridos, controles operativos y condiciones de entrega." },
    { title: "Material adjunto", purpose: "Recopilar documentación de soporte para el levantamiento." },
  ][sectionNumber - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-500">FORMULARIO DE LEVANTAMIENTO</p>
          <h1 className="text-2xl font-semibold text-[#0f2b46]">Sección {sectionNumber}: {sectionMeta.title}</h1>
          <p className="text-sm text-slate-600 mt-1">{sectionMeta.purpose}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${status === "SUBMITTED" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : status === "REOPENED" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-600"}`}>{status}</span>
          {draftStatus === "saving" && <span className="text-xs text-slate-500">Guardando...</span>}
          {draftStatus === "saved" && <span className="text-xs text-emerald-700">Guardado</span>}
          {draftStatus === "error" && <span className="text-xs text-red-600">Error</span>}
        </div>
      </div>

      <FormProgress current={sectionNumber} submittedCount={submittedCount} />

      <div className="hidden sm:block">
        <Stepper steps={steps} current={sectionNumber} />
      </div>

      {message && (
        <div className={`rounded-xl border p-4 text-sm ${message.includes("Gracias") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          <p className="font-medium">{message}</p>
          {!message.includes("Gracias") && issueList.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {issueList.map((it, idx) => (
                <li key={idx} className="flex gap-2 text-sm">
                  <span className="text-amber-700 font-medium shrink-0">• {it.pretty}:</span>
                  <span className="text-amber-800">{it.message}</span>
                </li>
              ))}
            </ul>
          )}
          {!message.includes("Gracias") && issueList.length > 0 && (
            <p className="mt-3 text-xs text-amber-700">Corrige los campos marcados en rojo y vuelve a intentar.</p>
          )}
          {message.includes("Gracias") && (
            <div className="mt-3 flex gap-2">
              {sectionNumber < 5 ? (
                <Link href={`/submissions/${submissionId}/section/${sectionNumber + 1}`}>
                  <Button size="sm">Continuar con siguiente sección →</Button>
                </Link>
              ) : (
                <Link href={`/submissions/${submissionId}`}>
                  <Button size="sm">Volver al panel</Button>
                </Link>
              )}
              <Link href={`/submissions/${submissionId}`}>
                <Button variant="secondary" size="sm">Volver al levantamiento</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{sectionMeta.title}</CardTitle>
          <CardDescription>
            Estado: {status} · Sección {sectionNumber} de 5 · {sectionNumber * 20}%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SECTION 1 */}
          {sectionNumber === 1 && (
            <>
              <div>
                <Label htmlFor="objective">Objetivo principal del sistema *</Label>
                <Textarea id="objective" value={s1.objective} onChange={(e) => setS1({ ...s1, objective: e.target.value })} placeholder="Ej: hacer cálculos que hoy se llevan en Excel, reducir errores, generar soportes para ISLR, centralizar información." rows={4} disabled={isReadOnly} />
                <div className="flex justify-between mt-1.5">
                  <HelpText>Mín 30, máx 500 caracteres</HelpText>
                  <span className="text-xs text-slate-400">{s1.objective.length}/500</span>
                </div>
                {errors["objective"] && <FieldError message={errors["objective"]} />}
              </div>

              <div>
                <Label>Tipos de usuario previstos *</Label>
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  {USER_TYPES.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={s1.userTypes.includes(opt)} onChange={() => setS1({ ...s1, userTypes: toggleArrayInline(s1.userTypes, opt) })} disabled={isReadOnly} className="rounded" />
                      {opt}
                    </label>
                  ))}
                </div>
                {errors["userTypes"] && <FieldError message={errors["userTypes"]} />}
                {s1.userTypes.includes("Otro") && (
                  <div className="mt-3">
                    <Label htmlFor="otherUserType">Especifique otro tipo de usuario *</Label>
                    <Input id="otherUserType" value={s1.otherUserType} onChange={(e) => setS1({ ...s1, otherUserType: e.target.value })} maxLength={150} placeholder="Describa otro perfil" disabled={isReadOnly} />
                    {errors["otherUserType"] && <FieldError message={errors["otherUserType"]} />}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="permissions">Permisos por tipo de usuario *</Label>
                <HelpText>Indique qué puede hacer cada perfil: cargar, editar, calcular, aprobar, cerrar períodos, exportar o solo consultar.</HelpText>
                <Textarea id="permissions" value={s1.permissions} onChange={(e) => setS1({ ...s1, permissions: e.target.value })} rows={4} disabled={isReadOnly} />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-slate-500">Mín 30, máx 1000</span>
                  <span className="text-xs text-slate-400">{s1.permissions.length}/1000</span>
                </div>
                {errors["permissions"] && <FieldError message={errors["permissions"]} />}
              </div>
            </>
          )}

          {/* SECTION 2 */}
          {sectionNumber === 2 && (
            <>
              <div>
                <Label>Alcance del ajuste *</Label>
                <div className="mt-2 space-y-2">
                  {SCOPE_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50">
                      <input type="radio" name="scope" checked={s2.scope === opt} onChange={() => setS2({ ...s2, scope: opt })} disabled={isReadOnly} />
                      {opt}
                    </label>
                  ))}
                </div>
                {errors["scope"] && <FieldError message={errors["scope"]} />}
                {s2.scope === "Ajuste fiscal y contable/financiero" && (
                  <div className="mt-3">
                    <Label htmlFor="scopeSeparation">Separación de cálculos, libros y reportes *</Label>
                    <Textarea id="scopeSeparation" value={s2.scopeSeparation} onChange={(e) => setS2({ ...s2, scopeSeparation: e.target.value })} rows={3} disabled={isReadOnly} />
                    {errors["scopeSeparation"] && <FieldError message={errors["scopeSeparation"]} />}
                  </div>
                )}
                {s2.scope === "Otro" && (
                  <div className="mt-3">
                    <Label>Especifique otro alcance *</Label>
                    <Input value={s2.otherScope} onChange={(e) => setS2({ ...s2, otherScope: e.target.value })} maxLength={200} disabled={isReadOnly} />
                    {errors["otherScope"] && <FieldError message={errors["otherScope"]} />}
                  </div>
                )}
              </div>

              <div>
                <Label>Procesos incluidos en la primera versión *</Label>
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  {PROCESS_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={s2.processes.includes(opt)} onChange={() => setS2({ ...s2, processes: toggleArrayInline(s2.processes, opt) })} disabled={isReadOnly} />
                      {opt}
                    </label>
                  ))}
                </div>
                {errors["processes"] && <FieldError message={errors["processes"]} />}
                {s2.processes.includes("Otro") && (
                  <div className="mt-3">
                    <Label>Especifique otro proceso *</Label>
                    <Input value={s2.otherProcess} onChange={(e) => setS2({ ...s2, otherProcess: e.target.value })} maxLength={200} disabled={isReadOnly} />
                    {errors["otherProcess"] && <FieldError message={errors["otherProcess"]} />}
                  </div>
                )}
              </div>

              <div>
                <Label>Tipos de partidas a procesar *</Label>
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  {PARTIDA_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={s2.partidas.includes(opt)} onChange={() => setS2({ ...s2, partidas: toggleArrayInline(s2.partidas, opt) })} disabled={isReadOnly} />
                      {opt}
                    </label>
                  ))}
                </div>
                {errors["partidas"] && <FieldError message={errors["partidas"]} />}
                {s2.partidas.includes("Otro") && (
                  <div className="mt-3">
                    <Label>Especifique otro tipo de partida *</Label>
                    <Input value={s2.otherPartida} onChange={(e) => setS2({ ...s2, otherPartida: e.target.value })} maxLength={200} disabled={isReadOnly} />
                    {errors["otherPartida"] && <FieldError message={errors["otherPartida"]} />}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="exclusions">Partidas que deben excluirse *</Label>
                <Textarea id="exclusions" value={s2.exclusions} onChange={(e) => setS2({ ...s2, exclusions: e.target.value })} rows={3} disabled={isReadOnly} />
                <HelpText>Mín 20, máx 500</HelpText>
                {errors["exclusions"] && <FieldError message={errors["exclusions"]} />}
              </div>
            </>
          )}

          {/* SECTION 3 */}
          {sectionNumber === 3 && (
            <>
              <div>
                <Label>Origen de los datos *</Label>
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  {ORIGINS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={s3.dataOrigins.includes(opt)} onChange={() => setS3({ ...s3, dataOrigins: toggleArrayInline(s3.dataOrigins, opt) })} disabled={isReadOnly} />
                      {opt}
                    </label>
                  ))}
                </div>
                {errors["dataOrigins"] && <FieldError message={errors["dataOrigins"]} />}
                {(s3.dataOrigins.includes("Sistema administrativo-contable") || s3.dataOrigins.includes("API") || s3.dataOrigins.includes("Archivos exportados")) && (
                  <div className="mt-3">
                    <Label>Sistemas intervinientes *</Label>
                    <Textarea value={s3.systems} onChange={(e) => setS3({ ...s3, systems: e.target.value })} rows={2} placeholder="Detalle nombre, versión y alcance" disabled={isReadOnly} />
                    {errors["systems"] && <FieldError message={errors["systems"]} />}
                    <div className="mt-3">
                      <FileUploader submissionId={submissionId} sectionNumber={3} category="DATA_EXAMPLE" label="Adjuntar ejemplos anonimizados (opcional)" accept=".xls,.xlsx,.csv,.pdf" multiple description="Máx 20 MB por archivo · .xls .xlsx .csv .pdf" />
                    </div>
                  </div>
                )}
                {s3.dataOrigins.includes("Otro") && (
                  <div className="mt-3">
                    <Label>Especifique otro origen *</Label>
                    <Input value={s3.otherOrigin} onChange={(e) => setS3({ ...s3, otherOrigin: e.target.value })} maxLength={200} disabled={isReadOnly} />
                    {errors["otherOrigin"] && <FieldError message={errors["otherOrigin"]} />}
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Fuente oficial del INPC *</Label>
                  <div className="mt-2 space-y-2">
                    {INPC_OPTS.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                        <input type="radio" name="inpcSource" checked={s3.inpcSource === opt} onChange={() => setS3({ ...s3, inpcSource: opt })} disabled={isReadOnly} />
                        {opt}
                      </label>
                    ))}
                  </div>
                  {errors["inpcSource"] && <FieldError message={errors["inpcSource"]} />}
                </div>
                {s3.inpcSource === "Fuente externa" && (
                  <div>
                    <Label>URL o API de la fuente *</Label>
                    <Input value={s3.inpcSourceUrl} onChange={(e) => setS3({ ...s3, inpcSourceUrl: e.target.value })} maxLength={300} placeholder="https://..." disabled={isReadOnly} />
                    {errors["inpcSourceUrl"] && <FieldError message={errors["inpcSourceUrl"]} />}
                  </div>
                )}
                {s3.inpcSource === "Otro" && (
                  <div>
                    <Label>Especifique otra fuente *</Label>
                    <Input value={s3.otherInpcSource} onChange={(e) => setS3({ ...s3, otherInpcSource: e.target.value })} maxLength={200} disabled={isReadOnly} />
                    {errors["otherInpcSource"] && <FieldError message={errors["otherInpcSource"]} />}
                  </div>
                )}
              </div>

              <div>
                <Label>Responsable de aprobar los índices INPC *</Label>
                <Input value={s3.inpcApprover} onChange={(e) => setS3({ ...s3, inpcApprover: e.target.value })} maxLength={200} placeholder="Nombre, cargo o rol" disabled={isReadOnly} />
                {errors["inpcApprover"] && <FieldError message={errors["inpcApprover"]} />}
              </div>

              <div>
                <Label>Criterios, fórmulas y reglas de cálculo *</Label>
                <HelpText>Se almacena verbatim, sin interpretación automática.</HelpText>
                <Textarea value={s3.criteria} onChange={(e) => setS3({ ...s3, criteria: e.target.value })} rows={4} placeholder="Describa criterios, fórmulas RAR, depreciación, patrimonio..." disabled={isReadOnly} />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-slate-500">Mín 50, máx 2000</span>
                  <span className="text-xs text-slate-400">{s3.criteria.length}/2000</span>
                </div>
                {errors["criteria"] && <FieldError message={errors["criteria"]} />}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Casos de cálculo * (mínimo 2)</Label>
                  {!isReadOnly && (
                    <Button variant="secondary" size="sm" onClick={() => setS3({ ...s3, cases: [...s3.cases, { ...EMPTY_CASE }] })}>
                      + Agregar caso
                    </Button>
                  )}
                </div>
                {errors["cases"] && <FieldError message={errors["cases"]} />}
                <div className="mt-3 space-y-4">
                  {(s3.cases.length === 0 ? [TEST_CASE_1, TEST_CASE_2] : s3.cases).map((c, idx) => (
                    <Card key={idx} className="border-slate-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Caso {idx + 1}</CardTitle>
                          {!isReadOnly && s3.cases.length > 1 && (
                            <span className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setS3({ ...s3, cases: [...s3.cases, { ...c }] })}>Duplicar</Button>
                              <Button variant="ghost" size="sm" onClick={() => setS3({ ...s3, cases: s3.cases.filter((_, i) => i !== idx) })} className="text-red-600">Eliminar</Button>
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`caseType-${idx}`}>Tipo de caso *</Label>
                            <select
                              id={`caseType-${idx}`}
                              value={c.caseType as string}
                              onChange={(e) => updateCase(idx, "caseType", e.target.value)}
                              disabled={isReadOnly}
                              aria-describedby={errors[`cases.${idx}.caseType`] ? `err-${idx}-caseType` : undefined}
                              className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-sky-500"
                            >
                              <option>Ajuste inicial</option>
                              <option>Reajuste con aumento neto de patrimonio</option>
                              <option>Reajuste con disminución neta</option>
                              <option>Otro</option>
                            </select>
                            {errors[`cases.${idx}.caseType`] && <FieldError message={errors[`cases.${idx}.caseType`]} />}
                            {c.caseType === "Otro" && (
                              <div className="mt-2">
                                <Input
                                  placeholder="Especifique tipo"
                                  value={(c.otherCaseType as string) || ""}
                                  onChange={(e) => updateCase(idx, "otherCaseType", e.target.value)}
                                  disabled={isReadOnly}
                                  aria-describedby={errors[`cases.${idx}.otherCaseType`] ? `err-${idx}-otherCaseType` : undefined}
                                />
                                {errors[`cases.${idx}.otherCaseType`] && <FieldError message={errors[`cases.${idx}.otherCaseType`]} />}
                              </div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`identifier-${idx}`}>Nombre o identificador *</Label>
                            <Input
                              id={`identifier-${idx}`}
                              value={(c.identifier as string) || ""}
                              onChange={(e) => updateCase(idx, "identifier", e.target.value)}
                              maxLength={200}
                              disabled={isReadOnly}
                              aria-describedby={errors[`cases.${idx}.identifier`] ? `err-${idx}-identifier` : undefined}
                              className={errors[`cases.${idx}.identifier`] ? "border-red-300 focus-visible:ring-red-500" : ""}
                            />
                            {errors[`cases.${idx}.identifier`] && <FieldError message={errors[`cases.${idx}.identifier`]} />}
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor={`initialBalances-${idx}`}>Saldos iniciales *</Label>
                            <Textarea
                              id={`initialBalances-${idx}`}
                              value={(c.initialBalances as string) || ""}
                              onChange={(e) => updateCase(idx, "initialBalances", e.target.value)}
                              rows={2}
                              disabled={isReadOnly}
                              aria-describedby={errors[`cases.${idx}.initialBalances`] ? `err-${idx}-initialBalances` : undefined}
                              className={errors[`cases.${idx}.initialBalances`] ? "border-red-300" : ""}
                            />
                            {errors[`cases.${idx}.initialBalances`] && <FieldError message={errors[`cases.${idx}.initialBalances`]} />}
                          </div>
                          <div>
                            <Label htmlFor={`date-${idx}`}>Fecha *</Label>
                            <Input
                              id={`date-${idx}`}
                              type="date"
                              value={(c.date as string) || ""}
                              onChange={(e) => updateCase(idx, "date", e.target.value)}
                              disabled={isReadOnly}
                              aria-describedby={errors[`cases.${idx}.date`] ? `err-${idx}-date` : undefined}
                              className={errors[`cases.${idx}.date`] ? "border-red-300" : ""}
                            />
                            {errors[`cases.${idx}.date`] && <FieldError message={errors[`cases.${idx}.date`]} />}
                          </div>
                          <div>
                            <Label htmlFor={`inpc-${idx}`}>INPC * (positivo, máx 4 decimales)</Label>
                            <Input
                              id={`inpc-${idx}`}
                              type="number"
                              step="0.0001"
                              min="0"
                              value={(c.inpc as string) || ""}
                              onChange={(e) => updateCase(idx, "inpc", e.target.value)}
                              disabled={isReadOnly}
                              aria-describedby={errors[`cases.${idx}.inpc`] ? `err-${idx}-inpc` : undefined}
                              className={errors[`cases.${idx}.inpc`] ? "border-red-300" : ""}
                            />
                            {errors[`cases.${idx}.inpc`] && <FieldError message={errors[`cases.${idx}.inpc`]} />}
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor={`movements-${idx}`}>Movimientos *</Label>
                            <Textarea
                              id={`movements-${idx}`}
                              value={(c.movements as string) || ""}
                              onChange={(e) => updateCase(idx, "movements", e.target.value)}
                              rows={2}
                              disabled={isReadOnly}
                              aria-describedby={errors[`cases.${idx}.movements`] ? `err-${idx}-movements` : undefined}
                              className={errors[`cases.${idx}.movements`] ? "border-red-300" : ""}
                            />
                            {errors[`cases.${idx}.movements`] && <FieldError message={errors[`cases.${idx}.movements`]} />}
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor={`expectedResult-${idx}`}>Resultado esperado *</Label>
                            <Textarea
                              id={`expectedResult-${idx}`}
                              value={(c.expectedResult as string) || ""}
                              onChange={(e) => updateCase(idx, "expectedResult", e.target.value)}
                              rows={2}
                              disabled={isReadOnly}
                              aria-describedby={errors[`cases.${idx}.expectedResult`] ? `err-${idx}-expectedResult` : undefined}
                              className={errors[`cases.${idx}.expectedResult`] ? "border-red-300" : ""}
                            />
                            {errors[`cases.${idx}.expectedResult`] && <FieldError message={errors[`cases.${idx}.expectedResult`]} />}
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor={`ruleExplanation-${idx}`}>Explicación de la regla aplicada *</Label>
                            <Textarea
                              id={`ruleExplanation-${idx}`}
                              value={(c.ruleExplanation as string) || ""}
                              onChange={(e) => updateCase(idx, "ruleExplanation", e.target.value)}
                              rows={2}
                              disabled={isReadOnly}
                              aria-describedby={errors[`cases.${idx}.ruleExplanation`] ? `err-${idx}-ruleExplanation` : undefined}
                              className={errors[`cases.${idx}.ruleExplanation`] ? "border-red-300" : ""}
                            />
                            {errors[`cases.${idx}.ruleExplanation`] && <FieldError message={errors[`cases.${idx}.ruleExplanation`]} />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!isReadOnly && s3.cases.length < 2 && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">Debe agregar al menos 2 casos para poder enviar.</p>}
                </div>
              </div>
            </>
          )}

          {/* SECTION 4 */}
          {sectionNumber === 4 && (
            <>
              <div>
                <Label>Reportes, documentos y exportaciones requeridos *</Label>
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  {REPORTS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={s4.reports.includes(opt)} onChange={() => setS4({ ...s4, reports: toggleArrayInline(s4.reports, opt) })} disabled={isReadOnly} />
                      {opt}
                    </label>
                  ))}
                </div>
                {errors["reports"] && <FieldError message={errors["reports"]} />}
                {s4.reports.includes("Formatos específicos para clientes/contadores/SENIAT") && (
                  <div className="mt-3">
                    <Label>Detalle de formatos específicos *</Label>
                    <Textarea value={s4.reportFormatsDetail} onChange={(e) => setS4({ ...s4, reportFormatsDetail: e.target.value })} rows={2} disabled={isReadOnly} />
                    {errors["reportFormatsDetail"] && <FieldError message={errors["reportFormatsDetail"]} />}
                  </div>
                )}
                {s4.reports.includes("Otro") && (
                  <div className="mt-3">
                    <Label>Especifique otro reporte *</Label>
                    <Input value={s4.otherReport} onChange={(e) => setS4({ ...s4, otherReport: e.target.value })} maxLength={200} disabled={isReadOnly} />
                    {errors["otherReport"] && <FieldError message={errors["otherReport"]} />}
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <Label>Cantidad estimada de empresas *</Label>
                  <Input type="number" min={0} value={String(s4.estimatedCompanies)} onChange={(e) => setS4({ ...s4, estimatedCompanies: e.target.value })} disabled={isReadOnly} />
                  {errors["estimatedCompanies"] && <FieldError message={errors["estimatedCompanies"]} />}
                </div>
                <div>
                  <Label>Cantidad estimada de usuarios *</Label>
                  <Input type="number" min={0} value={String(s4.estimatedUsers)} onChange={(e) => setS4({ ...s4, estimatedUsers: e.target.value })} disabled={isReadOnly} />
                </div>
                <div>
                  <Label>Años históricos a cargar *</Label>
                  <Input type="number" min={0} value={String(s4.historicalYears)} onChange={(e) => setS4({ ...s4, historicalYears: e.target.value })} disabled={isReadOnly} />
                </div>
              </div>

              <div>
                <Label>Volumen de activos y movimientos *</Label>
                <Textarea value={s4.assetVolume} onChange={(e) => setS4({ ...s4, assetVolume: e.target.value })} rows={2} maxLength={500} disabled={isReadOnly} />
                {errors["assetVolume"] && <FieldError message={errors["assetVolume"]} />}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <input type="checkbox" checked={s4.multiCompany} onChange={(e) => setS4({ ...s4, multiCompany: e.target.checked })} disabled={isReadOnly} /> Operación multiempresa *
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <input type="checkbox" checked={s4.auditTrail} onChange={(e) => setS4({ ...s4, auditTrail: e.target.checked })} disabled={isReadOnly} /> Auditoría de cambios *
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <input type="checkbox" checked={s4.periodLock} onChange={(e) => setS4({ ...s4, periodLock: e.target.checked })} disabled={isReadOnly} /> Bloqueo de períodos cerrados *
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                  <input type="checkbox" checked={s4.backup} onChange={(e) => setS4({ ...s4, backup: e.target.checked })} disabled={isReadOnly} /> Respaldo de documentos *
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Flujo de revisión y aprobación *</Label>
                  <Textarea value={s4.reviewFlow} onChange={(e) => setS4({ ...s4, reviewFlow: e.target.value })} rows={2} maxLength={1000} disabled={isReadOnly} />
                </div>
                <div>
                  <Label>Permisos *</Label>
                  <Textarea value={s4.permissionsDetail} onChange={(e) => setS4({ ...s4, permissionsDetail: e.target.value })} rows={2} maxLength={1000} disabled={isReadOnly} />
                </div>
                <div>
                  <Label>Disponibilidad requerida *</Label>
                  <Input value={s4.availability} onChange={(e) => setS4({ ...s4, availability: e.target.value })} maxLength={200} disabled={isReadOnly} />
                </div>
                <div>
                  <Label>Despliegue *</Label>
                  <select value={s4.deployment} onChange={(e) => setS4({ ...s4, deployment: e.target.value })} disabled={isReadOnly} className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option>Web</option>
                    <option>Local</option>
                    <option>Ambos</option>
                  </select>
                </div>
                <div>
                  <Label>Idioma *</Label>
                  <select value={s4.language} onChange={(e) => setS4({ ...s4, language: e.target.value })} disabled={isReadOnly} className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option>Español</option>
                    <option>Inglés</option>
                    <option>Otro</option>
                  </select>
                  {s4.language === "Otro" && <Input value={s4.otherLanguage} onChange={(e) => setS4({ ...s4, otherLanguage: e.target.value })} placeholder="Especifique idioma" className="mt-2" disabled={isReadOnly} />}
                </div>
                <div>
                  <Label>Moneda *</Label>
                  <select value={s4.currency} onChange={(e) => setS4({ ...s4, currency: e.target.value })} disabled={isReadOnly} className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option>VES</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>Otra</option>
                  </select>
                  {s4.currency === "Otra" && <Input value={s4.otherCurrency} onChange={(e) => setS4({ ...s4, otherCurrency: e.target.value })} placeholder="Especifique moneda" className="mt-2" disabled={isReadOnly} />}
                </div>
                <div className="sm:col-span-2">
                  <Label>Redondeos *</Label>
                  <Input value={s4.rounding} onChange={(e) => setS4({ ...s4, rounding: e.target.value })} maxLength={200} disabled={isReadOnly} />
                </div>
                <div>
                  <Label>Presupuesto estimado (opcional)</Label>
                  <Input value={s4.budget} onChange={(e) => setS4({ ...s4, budget: e.target.value })} placeholder="Ej: 3500 USD" disabled={isReadOnly} />
                </div>
                <div>
                  <Label>Fecha objetivo (opcional)</Label>
                  <Input type="date" value={s4.targetDate} onChange={(e) => setS4({ ...s4, targetDate: e.target.value })} disabled={isReadOnly} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Fases de entrega *</Label>
                  <Textarea value={s4.deliveryPhases} onChange={(e) => setS4({ ...s4, deliveryPhases: e.target.value })} rows={2} maxLength={1000} disabled={isReadOnly} />
                </div>
              </div>
            </>
          )}

          {/* SECTION 5 */}
          {sectionNumber === 5 && (
            <>
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">Todos los archivos deben almacenarse en un Blob Store privado. No se almacenan binarios en PostgreSQL.</p>

              <FileUploader submissionId={submissionId} sectionNumber={5} category="DATA_EXAMPLE" label="1. Excel real anonimizado de ajuste inicial y/o regular" accept=".xls,.xlsx,.csv" multiple description="Opcional · Múltiples · 20 MB · .xls .xlsx .csv" />
              <FileUploader submissionId={submissionId} sectionNumber={5} category="BALANCE" label="2. Balance de comprobación o balance general de ejemplo" accept=".xls,.xlsx,.csv,.pdf" description="Opcional · 20 MB" />
              <FileUploader submissionId={submissionId} sectionNumber={5} category="CHART_OF_ACCOUNTS" label="3. Plan de cuentas contable y clasificación fiscal" accept=".xls,.xlsx,.csv,.pdf" description="Opcional · 20 MB" />
              <FileUploader submissionId={submissionId} sectionNumber={5} category="FINAL_REPORT" label="4. Ejemplos de reportes finales" accept=".xls,.xlsx,.csv,.pdf,.docx" multiple description="Opcional · Múltiples · 20 MB" />
              <FileUploader submissionId={submissionId} sectionNumber={5} category="REVIEWED_CASE" label="5. Caso calculado y revisado con resultado esperado" accept=".xls,.xlsx,.csv,.pdf,.docx" description="Opcional · 20 MB" />
              <FileUploader submissionId={submissionId} sectionNumber={5} category="LEGAL_FRAMEWORK" label="6. Marco legal, manual, plantilla o criterio profesional" accept=".pdf,.docx,.xls,.xlsx,.csv" multiple description="Opcional · Múltiples · 20 MB" />
              <FileUploader submissionId={submissionId} sectionNumber={5} category="COMPANY_LIST" label="7. Lista de empresas tipo (archivo opcional)" accept=".xls,.xlsx,.csv,.pdf" description="Opcional · .xls .xlsx .csv .pdf · 20 MB" />

              <div>
                <Label htmlFor="companyListText">7. Lista de empresas tipo *</Label>
                <HelpText>Incluya actividad económica, cierre fiscal, tamaño aproximado y particularidades.</HelpText>
                <Textarea id="companyListText" value={s5.companyListText} onChange={(e) => setS5({ ...s5, companyListText: e.target.value })} rows={3} maxLength={1000} disabled={isReadOnly} />
                {errors["companyListText"] && <FieldError message={errors["companyListText"]} />}
              </div>

              <div>
                <Label htmlFor="validators">8. Personas que validarán los resultados antes de producción *</Label>
                <Textarea id="validators" value={s5.validators} onChange={(e) => setS5({ ...s5, validators: e.target.value })} rows={3} maxLength={500} disabled={isReadOnly} />
                {errors["validators"] && <FieldError message={errors["validators"]} />}
              </div>

              <div>
                <Label>Archivos registrados</Label>
                <div className="mt-2">
                  <AttachmentList
                    attachments={attachments.map((a) => ({ id: a.id, originalName: a.originalName, sizeBytes: a.sizeBytes, category: a.category }))}
                    onDelete={async (id) => {
                      if (!confirm("¿Eliminar archivo?")) return;
                      try {
                        await deleteAttachmentAction(id);
                        toast.success("Archivo eliminado", "El documento fue retirado correctamente.");
                        setTimeout(() => window.location.reload(), 600);
                      } catch (e) {
                        toast.error("No se pudo eliminar", (e as Error).message);
                      }
                    }}
                  />
                </div>
                <HelpText>Un archivo se considera completo solo en estado REGISTERED (Blob + metadatos + asociación).</HelpText>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={handleSaveDraft} disabled={saving || submitting || isReadOnly}>
              {saving ? "Guardando..." : "Guardar borrador"}
            </Button>
            <Button onClick={handleSubmit} disabled={saving || submitting || isReadOnly}>
              {submitting ? "Enviando..." : sectionNumber === 5 ? "Enviar material adjunto" : `Enviar sección ${sectionNumber}`}
            </Button>
            <Link href={`/submissions/${submissionId}`}>
              <Button variant="ghost">Volver</Button>
            </Link>
            {sectionNumber < 5 && (
              <Link href={`/submissions/${submissionId}/section/${sectionNumber + 1}`} className="ml-auto">
                <Button variant="ghost">Siguiente →</Button>
              </Link>
            )}
          </div>

          {isReadOnly && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">Esta sección ya fue enviada. Solo un administrador puede reabrirla.</p>}
        </CardContent>
      </Card>

      <div className="flex justify-between text-sm">
        {sectionNumber > 1 ? (
          <Link href={`/submissions/${submissionId}/section/${sectionNumber - 1}`} className="text-slate-600 hover:text-slate-900">
            ← Sección {sectionNumber - 1}
          </Link>
        ) : (
          <span />
        )}
        {sectionNumber < 5 ? (
          <Link href={`/submissions/${submissionId}/section/${sectionNumber + 1}`} className="text-slate-600 hover:text-slate-900">
            Sección {sectionNumber + 1} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );

  function toggleArrayInline(arr: string[], value: string) {
    if (arr.includes(value)) return arr.filter((x) => x !== value);
    return [...arr, value];
  }

  function updateCase(idx: number, field: string, value: string) {
    const copy = [...s3.cases];
    // ensure cases array exists
    if (copy.length === 0) copy.push({} as Record<string, string>);
    copy[idx] = { ...copy[idx], [field]: value };
    setS3({ ...s3, cases: copy });
  }
}
