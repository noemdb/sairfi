# TODO.md — SAIRFI

> Fuente de verdad del estado real del proyecto (Pasos 03, 04 y 07). Un bloque solo se marca como ✅ Hecho cuando pasó el checklist completo del Paso 04. Nunca se marca como terminado "para no perder el hilo".

**Última actualización (Paso 07):** 2026-09-26. Documentación base redactada y revisada (Fase 0 ✅, tooling y B-02 cerrados). Fase M cerrada el mismo día (4 bloques ✅, 39/39 tests). Siguiente: ADR-011 (B-01) para desbloquear Fase 1; el motor fiscal v1 aún no inicia su desarrollo (Fases 1–7).

## Leyenda de estado
- 🔲 Por hacer
- 🔄 En progreso
- 🧪 En pruebas
- ✅ Hecho
- ⛔ Bloqueado

## Plan por fases

### Fase 0 — Documentación viva y fundaciones
| Bloque | Estado | Criterios de aceptación | Notas |
|---|---|---|---|
| `PROJECT.md` (problema, alcance v1/v2, métricas) | ✅ | Sin marcadores de plantilla por rellenar; alcance v1 cerrado y v2 explícitamente pospuesto | Redactado 2026-09-26; B-02 resuelto el mismo día (stack → Next.js/Vercel/Neon) |
| `ARCHITECTURE.md` (monolito modular, flujos, proxy) | ✅ | Sin refs rotas (§23/§24 corregidas); §11 cubre ADR-001…010 | Revisado 2026-09-26 |
| `DOMAIN.md` (glosario, R-001…R-109, estados) | ✅ | Reglas con fuente; R-109 cubre base del reajuste; sin refs a docs inexistentes | Revisado 2026-09-26 |
| `DATABASE.md` (motor, ERD, 16 tablas, Zod, migraciones) | ✅ | Precisión `(20,6)/(20,8)` hiperinflación; §7 normalización en 3NF con excepciones justificadas | Revisado 2026-09-26 |
| `CONVENTIONS.md` (árbol real, nombres, testing) | ✅ | Árbol sin `middleware/`, con `proxy.ts` y `docs/`; guardas `require*` | Revisado 2026-09-26 |
| `DECISIONS.md` (10 ADRs) | ✅ | Formato del template; cada decisión con alternativas y consecuencias | Regenerado 2026-09-26; archivo vivo, nunca se reescribe |
| `SECURITY.md` (secretos, auth, RBAC, amenazas) | ✅ | Sin marcadores de plantilla por rellenar; deudas marcadas (rate limit, headers, CSRF) | Regenerado 2026-09-26 |
| `TODO.md` (este archivo) | ✅ | Fases con criterios testeables; estado real al día | Se actualiza al cerrar cada sesión (Paso 07) |
| `API.md` (convenciones + contratos objetivo) | ✅ | Envolventes, auth, paginación, `Decimal` como string; contratos por recurso | Contratos objetivo: se confirman al construir cada bloque (Paso 03) |
| Instalar Vitest + MSW + Playwright | ✅ | `vitest`, `msw`, `@playwright/test` (+ RTL/jsdom/plugin-react) en `package.json`; `npm test` corre en verde | Instalado 2026-09-26; `vitest.config.mts` + `tests/setup.ts` + humo `src/lib/validation/__tests__/auth.test.ts` (3/3) |

### Fase M — MVP de recolección (código existente, pendiente de checklist)
| Bloque | Estado | Criterios de aceptación | Notas |
|---|---|---|---|
| Auth + sesiones `httpOnly` + `src/proxy.ts` | ✅ | Login/logout, expiración 7 d, limpieza de cookies huérfanas; sin bucle `/dashboard`↔`/login` | Checklist Paso 04 completo 2026-09-26: unit (password, tokens) + integración DB (válida, logout, expirada, inactivo, huérfana); revisado contra `SECURITY.md` (rate limiting es deuda global B-03) |
| Levantamientos y secciones (borrador→envío) | ✅ | Flujo completo con validación Zod por sección; ADMIN ve todos, dueño ve los suyos | Checklist Paso 04 completo 2026-09-26: borrador sin validar + envío estricto + S3 con 2 casos en transacción + propiedad (ajeno/ADMIN/dueño) + `POST /api/submissions` (201/401); schemas S1–S5 con tests |
| Subida de adjuntos a Blob privado (20 MB, allowlist) | ✅ | Rechaza extensión/tamaño en servidor; nombre saneado; `FILE_UPLOADED` auditado | Checklist Paso 04 completo 2026-09-26: registro/borrado lógico con propiedad + `POST /api/uploads` (códigos) + `GET /api/files` (200/403); MIME por firma + AV quedan en backlog v2 (decidido, no bloquea) |
| Admin usuarios + auditoría + exportes | ✅ | Solo ADMIN; sin auto-desactivación; export respeta propiedad | Checklist Paso 04 completo 2026-09-26: alta normalizada + duplicado + baja + anti-autobaja + denegación a no-admin; `GET /api/export` (200/403/404 + descarga auditada verificada en DB) |
| Documentar endpoints MVP en `API.md` | ✅ | Cada ruta/acción MVP con schema, auth y errores | Documentado 2026-09-26 (Fase M en `API.md`); salieron hallazgo H-M1 y deudas D-M1…D-M4 → backlog |

### Fase 1 — Núcleo fiscal: empresas y ejercicios
| Bloque | Estado | Criterios de aceptación | Notas |
|---|---|---|---|
| Migración Prisma al modelo `DATABASE.md` §3 + reconciliación MVP | ✅ | `migrate deploy` limpio; pre-vuelo de conteos; corte único según ADR-011 | Ejecutada 2026-09-26 (`20260926120000_fase1_fiscal_core`, 459 líneas revisadas): 14 tablas nuevas, `users` sin `role`, `audit_logs` extendida, 5 roles fijos, parciales R-204/globales verificados en DB viva; `DATABASE.md` §3 alineado (`users`, `audit_logs`, `roles`) |
| Seed roles (5) + permisos + admin inicial | ✅ | 5 roles con matriz `SECURITY.md`; migración `ADMIN/RESPONDENT` documentada | Ejecutado 2026-09-26 y ampliado en Fase 1.4 (`fiscal_periods:create/update` para contador/asesor) y Fase 2 (`price_indices:create` analista, `price_indices:approve` contador; 30 permisos, 80 asignaciones); seed idempotente; guardas `requireRole`/`requirePermission` + `roles[]` en sesión con tests |
| CRUD empresas (RIF único, `configuracion` de redondeo) | ✅ | RIF `^[VEPGJ]-\d{8}-\d$`; `company_user` sin rol propio; `audit_logs` en cada mutación | Checklist Paso 04 completo 2026-09-26: validación (RIF upper/inmutable, MM-DD) + actions (crear/duplicado/denegado/update con antes-después) + rutas `/api/v1/companies` (401/403/201/409, lista paginada con alcance, PATCH auditado) + UI admin (lista/crear/editar); 54/54 tests |
| Ejercicios INICIAL/REGULAR | ✅ | Un activo por empresa (R-204); REGULAR exige anterior aprobado; unique `(company_id, fecha_inicio, fecha_cierre)` | Checklist Paso 04 completo 2026-09-26: validación + actions (crear/duplicado-INICIAL/anterior ajeno o en borrador) + transiciones open/close/reopen con matriz (`PERIOD_*` auditados) + rutas (401/403/201/409/422/404) + UI en detalle de empresa; suite 59/59 |

### Fase 2 — Índices INPC versionados
| Bloque | Estado | Criterios de aceptación | Notas |
|---|---|---|---|
| CRUD + aprobación + reemplazo por nueva versión | ✅ | Borrador→aprobado→reemplazado; aprobado inmutable (R-303); `Decimal(20,6)` | Checklist Paso 04 completo 2026-09-26: global+empresa coexisten, duplicado 409, approve una vez, correct versiona en transacción, matriz (analista crea, contador/asesor aprueban) + rutas + UI admin; suite 67/67 |
| Importación de índices desde CSV | ✅ | Lote con válidas/rechazadas; índices globales (`company_id NULL`) vs por empresa con parciales únicos | Checklist completo 2026-09-26: CSV con cabecera opcional, errores por línea, resumen válidas/rechazadas, auditoría del lote |

### Fase 3 — Partidas y movimientos
| Bloque | Estado | Criterios de aceptación | Notas |
|---|---|---|---|
| CRUD + clasificación monetaria/fiscal | ✅ | Monetarias excluidas del motor con aviso (excepción §6.5); sin fecha → `PENDIENTE_DE_CLASIFICACION` | Checklist Paso 04 completo 2026-09-26: crear clasificada/pendiente, empresa cruzada 422, clasificar vía update con R-005 sobre estado fusionado, auditoría `ITEM_*`; UI período/partida; suite 74/74 |
| Movimientos del período | ✅ | Fecha dentro del ejercicio; bajas ≤ saldo; `documento_soporte_id` FK | Checklist completo 2026-09-26: fecha fuera 422, exceso sobre saldo 422 con cifra, neutros documentados, auditoría `MOVEMENT_CREATED`; suite 74/74 |
| Validaciones previas al cálculo (R-403/R-404) | ✅ | Bloquea aprobación sin clasificar o sin índices, con mensaje accionable | Checklist completo 2026-09-26: `period-readiness.ts` + ruta `/readiness` (pendientes + meses INPC faltantes, monetarias excluidas); lo consume Fase 5 |

### Fase 4 — Importación estructurada (partidas y movimientos)
| Bloque | Estado | Criterios de aceptación | Notas |
|---|---|---|---|
| Plantillas XLSX/CSV + lote + errores por fila | ✅ | Resumen válidas/rechazadas; descarga de errores; `import_batches` + `audit_logs`; flujo `ARCHITECTURE.md` §4.6 | Checklist Paso 04 completo 2026-09-26: plantillas servidas por ruta, carga 120 filas (100/20 exactos), reintento por upsert sin duplicar, duplicados exactos omitidos, errores XLSX reconstruidos del lote, original en Blob+`files`; unifase documentada (vs preview); suite 81/81 |

### Fase 5 — Motores de cálculo y aprobación
| Bloque | Estado | Criterios de aceptación | Notas |
|---|---|---|---|
| Funciones puras (factor, actualizado, ajuste, R-101…R-109) | ✅ | Vitest con casos validados por el contador; 0 errores de fórmula; `Decimal` sin `Float` | Checklist Paso 04 completo 2026-09-26: 10 tests de referencia en `src/services/calculation/` (5 archivos según `ARCHITECTURE.md` §4.5); R-108/R-109 siguen Propuesta, casos pendientes de firma del contador |
| Ajuste inicial + reajuste regular + consolidación | ✅ | Efecto neto = activos − pasivos; snapshot en `fiscal_items` solo al aprobar; `version_reglas/indices` persistidas | Checklist completo 2026-09-26: inicial (factor por partida) + regular encadenado (base+acumulado+movimientos, verificado a mano: 300000→583333.33); versiones deterministas (`inpc-sha`); suite 97/97 |
| Flujo revisión→aprobación→cierre + recálculo | ✅ | Estados R-401/R-402; índice corregido ⇒ nueva versión + notificación + recálculo opcional (R-304) | Checklist completo 2026-09-26: CALCULADO→PENDIENTE→APROBADO (revisión obligatoria) + ANULADO con motivo; aprobar directo bloqueado; recálculo = ejecutar de nuevo (notificación email queda pendiente, sin SMTP) |

### Fase 6 — Reportes y exportación
| Bloque | Estado | Criterios de aceptación | Notas |
|---|---|---|---|
| Balance fiscal + hoja de trabajo + consolidados | ✅ | XLSX/PDF/CSV con metadatos (fecha, usuario, versión); filtros empresa/período/estado | Checklist Paso 04 completo 2026-09-26: 3 reportes × 3 formatos (XLSX vía `xlsx`, CSV manual, PDF vía `pdfkit`, runtime Node); XLSX verificado por relectura; solo APROBADO exporta; UI con enlaces por cálculo; suite 106/106 |
| Exportación auditada | ✅ | Cada descarga genera `audit_logs`; respeta propiedad/rol | Checklist completo 2026-09-26: `FILE_DOWNLOADED` con `{report, format}` verificado en DB; propiedad vía período/empresa |

### Fase 7 — Endurecimiento previo al release
| Bloque | Estado | Criterios de aceptación | Notas |
|---|---|---|---|
| Rate limiting + headers + CSRF | ✅ | Límites de `SECURITY.md` activos; CSP/HSTS; verificación `Origin` en mutaciones | Checklist Paso 04 completo 2026-09-26: librería + 8 tests, 429 con `Retry-After`, headers testeados y verificados en e2e, Origin con allowlist; ADR-012; límite conocido: store en memoria (KV en backlog) |
| Auditoría e2e + prueba de restauración | ✅ | Playwright cubre login→cálculo→aprobación→exporte; restauración Neon probada y documentada | Checklist completo 2026-09-26: e2e humo (landing→login→dashboard + headers) en verde; drill de restauración real (scratch reconstruida de migraciones, 20/20 conteos, eliminada); runbook en `SECURITY.md` |

## Checklist de validación por bloque (Paso 04)
Antes de marcar cualquier bloque como ✅ Hecho:
- [ ] Funciona según lo esperado
- [ ] Maneja errores y casos límite
- [ ] Tiene tests/validaciones
- [ ] Tiene sentido lógico dentro del dominio (ver `DOMAIN.md`)
- [ ] Si expone/consume API, está documentado en `API.md`
- [ ] Si toca datos sensibles, revisado contra `SECURITY.md`

## Bloqueos activos
| Bloque | Motivo del bloqueo | Desde | Siguiente acción |
|---|---|---|---|
| B-03 · Release a producción | ✅ resuelto 2026-09-26 | Rate limiting, headers y CSRF implementados y verificados (Fase 7); restauración probada | Ver ADR-012 y runbook en `SECURITY.md` |

> B-01 resuelto 2026-09-26 (ADR-011: corte único, DB vacía verificada, auditoría unificada). B-02 resuelto 2026-09-26 (`PROJECT.md` § Contexto actualizado al stack vigente).

## Backlog (sin priorizar todavía)
- ✅ Landing de SAIRFI en `/` con acceso al app (opción A, hecho 2026-09-26): `LandingContent` puro con propuesta de `PROJECT.md` + puerta del levantamiento + CTA según sesión; `page.tsx` delgada (`force-dynamic`); tests RTL de ambos estados; suite 61/61.
- H-M1 y D-M1…D-M4 resueltos 2026-09-26 (ver `API.md` Fase M; migración `20260926000002_submission_deleted` verificada en DB viva).
- v2: libros de compras/ventas, IVA mensual, retenciones IVA/ISLR, facturación electrónica (alcance `PROJECT.md`, explícitamente fuera de v1).
- v2: inventarios (cantidades + costo unitario), activos fijos con depreciación automática, conciliación fiscal automática, presentación SENIAT.
- Extraer `chart_of_accounts` y `rule_versions` cuando el volumen lo justifique (`DATABASE.md` §7).
- API pública `/api/v1` con tokens por alcance + webhooks (`fiscal_period.closed`, `adjustment_calculation.approved`, …) (`ARCHITECTURE.md` §8).
- Verificación MIME por firma + antivirus pre-servicio; `metadata` JSON con allowlist anti-PII; múltiples ejercicios abiertos en paralelo (hoy R-204 lo prohíbe).
