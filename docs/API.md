# API.md — SAIRFI

> Se llena por bloque, en el Paso 03, en el mismo momento en que se construye cada endpoint o Server Action — no al final del proyecto.

**Estado (2026-09-26):** contratos **objetivo** derivados de `ARCHITECTURE.md` §4.3/§8, `DATABASE.md` §4 y `DOMAIN.md`. Cada bloque los confirma o corrige al construirse; la divergencia se anota aquí mismo, no en otro documento. La **Fase M** (MVP de recolección) está documentada desde el código real al final del archivo.

## Convenciones generales
- **Base URL / prefijo:** `/api/v1` para integraciones y descargas. Las mutaciones desde formularios usan **Server Actions** (`*Action`, `CONVENTIONS.md` §4.1) y no necesitan ruta HTTP.
- **Criterio Server Action vs Route Handler** (`ARCHITECTURE.md` §4.3, ADR-006): formulario autenticado → Server Action; integración externa, descarga de archivo o webhook → Route Handler.
- **Formato de respuesta estándar (éxito):**
  ```json
  { "data": {}, "meta": { "page": 1, "pageSize": 20, "total": 0 } }
  ```
  (`meta` solo en colecciones paginadas: `?page=&pageSize=`; Validación con Zod en el límite, nunca solo en cliente.)
- **Formato de respuesta estándar (error):**
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Mensaje accionable en español" } }
  ```
  Códigos: `VALIDATION_ERROR` (400/422), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404, también ante recurso ajeno para no enumerar), `CONFLICT` (409), `RATE_LIMITED` (429).
- **Autenticación:** cookie de sesión `httpOnly` (`SECURITY.md`); `401` sin sesión, `403` sin rol y `404` ante recurso de otra empresa. La API pública v2 usará tokens por alcance (fuera de v1, `ARCHITECTURE.md` §8.1).
- **Rate limiting por defecto:** pendiente de implementación; límites y plan en `SECURITY.md`. Todo `429` usa el envolvente de error con `code: "RATE_LIMITED"`.
- **Tipos:** IDs UUID (string); fechas ISO-8601 en UTC; **`Decimal` siempre como string** (`"1234.56"`, nunca `Float`) para preservar `Decimal(18,2)/(20,6)/(20,8)` de `DATABASE.md` §7.2.
- **Efectos transversales:** toda mutación escribe `audit_logs` (con IP/user-agent), revalida la ruta (`revalidatePath`) y respeta la máquina de estados de `DOMAIN.md` §3.5 (transiciones ilegales → `409`).

## Sesión y usuarios (base del MVP existente)

### `POST /api/auth/login` · `POST /api/auth/logout`
- **Descripción:** crea/destruye sesión servidora (token 256-bit, solo hash en DB, TTL 7 d).
- **Auth requerida:** No (login) / Sí (logout, cualquier rol).
- **Request schema:** `loginSchema` (`email ≤254`, `password 6–128`, `src/lib/validation/auth.ts`).
- **Response schema (éxito):** `{ "data": { "user": { "id": "uuid", "email": "a@b.com", "name": "…", "role": "ADMIN" } } }` + cookie `httpOnly`.
- **Errores posibles:** | 400 | cuerpo inválido | | 401 | credenciales inválidas (mensaje genérico, sin enumerar) |
- **Efectos secundarios:** `LOGIN`/`LOGOUT` en `audit_logs` + `lastLoginAt`.
- **Criterios de aceptación:** - [ ] 5 intentos fallidos no revelan si el email existe - [ ] logout revoca la sesión en DB, no solo borra la cookie

### Server Actions `createUserAction` / `deactivateUserAction`
- **Descripción:** alta y baja lógica de usuarios.
- **Auth requerida:** Sí — rol `admin` (objetivo; en MVP: `ADMIN`). Auto-desactivación rechazada.
- **Request schema:** `createUserSchema` (`email`, `name 2–100`, `password 8–128`, `role`).
- **Errores posibles:** | 403 | no admin | | 409 | email ya existe |
- **Efectos secundarios:** `USER_CREATED`/`USER_DEACTIVATED` auditados.
- **Criterios de aceptación:** - [ ] Solo admin; email normalizado (`trim().toLowerCase()`) - [ ] Hash `bcrypt` cost 12, jamás el plano en logs

## Empresas

### `GET /api/v1/companies` · `POST /api/v1/companies`
- **Descripción:** lista paginada y crea empresa (Server Action equivalente: `createCompanyAction`).
- **Auth requerida:** Sí — leer: `admin, analista, contador, asesor, auditor`; crear: `admin`.
- **Request schema:** `CreateCompanySchema` (`DATABASE.md` §4; RIF `^[VEPGJ]-\d{8}-\d$`).
- **Response schema (éxito):** `{ "data": { "company": { "id": "uuid", "nombre": "…", "rif": "J-12345678-9", "estado": "ACTIVA" } } }`.
- **Errores posibles:** | 400 | RIF con formato inválido | | 401 | sin sesión | | 403 | rol sin permiso | | 409 | RIF duplicado |
- **Efectos secundarios:** `audit_logs` + `company_user` (creador vinculado).
- **Criterios de aceptación:** - [ ] RIF duplicado → `409`, no `500` - [ ] Lista filtra por `estado` y pagina con `meta`

### `GET /api/v1/companies/[id]` · `PATCH /api/v1/companies/[id]`
- **Descripción:** detalle y actualización (incluye `configuracion` de redondeo/moneda).
- **Auth requerida:** Sí — leer: todos los roles; actualizar: `admin`.
- **Request schema:** `UpdateCompanySchema` (parcial).
- **Errores posibles:** | 403 | empresa ajena a mis asignaciones | | 404 | id inexistente |
- **Criterios de aceptación:** - [ ] Empresa ajena → `404`, no `403` (anti-enumeración) - [ ] Cambio de `configuracion` auditado con antes/después

## Ejercicios fiscales

### `POST /api/v1/companies/[companyId]/fiscal-periods` · `GET /api/v1/companies/[companyId]/fiscal-periods`
- **Descripción:** abre ejercicio `INICIAL`/`REGULAR` y lista el historial.
- **Auth requerida:** Sí — crear: `admin, contador`; leer: todos los roles con `fiscal_periods:read`.
- **Request schema:** `CreateFiscalPeriodSchema` (`fecha_inicio < fecha_cierre`, `ejercicio_anterior_id` si `REGULAR`).
- **Errores posibles:** | 409 | fechas duplicadas, segundo `INICIAL` (R-201) o anterior de otra empresa | | 422 | `REGULAR` sin anterior `APROBADO`/`CERRADO` |
- **Efectos secundarios:** estado inicial `BORRADOR`; `audit_logs` (`PERIOD_CREATED`).
- **Criterios de aceptación:** - [x] Rechaza `fecha_cierre ≤ fecha_inicio` con mensaje claro - [ ] `REGULAR` hereda base del cierre anterior (R-203, R-109; se verifica con el motor en Fase 5)

### `POST /api/v1/fiscal-periods/[id]/open`
- **Descripción:** `BORRADOR → ABIERTO`. El parcial R-204 rechaza el segundo no-cerrado (disciplina: un solo ejercicio no-cerrado por empresa — ni dos borradores coexisten; el siguiente se crea tras cerrar el anterior).
- **Auth requerida:** Sí — `fiscal_periods:update` (`admin, contador, asesor`).
- **Errores posibles:** | 409 | transición ilegal o parcial R-204 |
- **Efectos secundarios:** `audit_logs` (`PERIOD_OPENED` con antes/después).
- **Criterios de aceptación:** - [x] Abrir dos veces → `409` - [x] Crear con otro abierto → `409` por el parcial

### `POST /api/v1/fiscal-periods/[id]/close` · `POST /api/v1/fiscal-periods/[id]/reopen`
- **Descripción:** cierra (exige cero cálculos en borrador, R-405; fija `cerradoEn`) y reapertura formal con motivo y autorización (excepción DOMAIN.md §6.4).
- **Auth requerida:** Sí — `contador, asesor` (cerrar); `asesor` (reabrir).
- **Request schema:** `z.object({ motivo: z.string().min(10).max(500) })` (reopen).
- **Errores posibles:** | 409 | transición ilegal de estado o cálculos en borrador |
- **Criterios de aceptación:** - [x] Cerrar borrador → `409` - [x] Reapertura queda en `audit_logs` con motivo y autorizador - [ ] Cierre genera nueva versión del cálculo al re-cerrar (Fase 5, sin motor aún)

## Índices INPC

### `GET /api/v1/price-indices?anio=&fuente=` · `POST /api/v1/price-indices`
- **Descripción:** consulta (incluye globales `company_id NULL`) y carga en `BORRADOR`.
- **Auth requerida:** Sí — leer: todos; crear: `admin, analista`.
- **Request schema:** `{ tipo: "INPC", fuente: z.string().max(100), anio: z.number().int(), mes: z.number().int().min(1).max(12), valor: decimal-string(20,6), company_id: z.string().uuid().nullable() }`.
- **Errores posibles:** | 409 | duplicado por parcial único (global o por empresa) | | 422 | `valor ≤ 0` |
- **Criterios de aceptación:** - [x] Valor `0` o negativo → `422` - [x] Duplicado mismo mes/fuente/versión → `409` - [x] Global y por empresa coexisten el mismo mes

### `POST /api/v1/price-indices/[id]/approve`
- **Descripción:** `BORRADOR → APROBADO` (R-302); el aprobado es inmutable, la corrección crea nueva versión (R-303/R-304, ADR-009).
- **Auth requerida:** Sí — `asesor, contador`.
- **Errores posibles:** | 409 | ya aprobado o reemplazado |
- **Efectos secundarios:** `INDEX_APPROVED` / `INDEX_REPLACED` (nueva versión en borrador) auditados; notificar recálculo queda para Fase 5 (sin motor aún).
- **Criterios de aceptación:** - [x] Aprobar dos veces → `409` - [x] Editar aprobado es imposible por API (solo nueva versión con `version+1` en transacción)

## Partidas y movimientos

### `GET /api/v1/fiscal-periods/[id]/fiscal-items` · `POST /api/v1/fiscal-periods/[id]/fiscal-items`
- **Descripción:** lista (filtros `tipo`, `clasificacion_monetaria`, `categoria_fiscal`, `estado`, `cuenta_contable`) y crea partida. Equivalente Server Action: `createFiscalItemAction`.
- **Auth requerida:** Sí — leer: todos; crear/clasificar: `analista, contador`.
- **Request schema:** `CreateFiscalItemSchema` (`DATABASE.md` §4).
- **Errores posibles:** | 400 | `fecha_adquisicion` ausente en no monetaria (R-005 → pendiente de clasificación) | | 422 | `valor_historico < 0` |
- **Criterios de aceptación:** - [ ] Monetaria creada correctamente pero excluida del motor con aviso (DOMAIN.md §6.5; el motor es Fase 5) - [x] `company_id` del ítem = `company_id` del período (422 si cruza empresas, integridad §7.1) - [x] Sin fecha → `PENDIENTE_DE_CLASIFICACION` en vez de rechazo (§6.1)

### `POST /api/v1/fiscal-periods/[id]/imports?tipo=FISCAL_ITEMS|FISCAL_MOVEMENTS` (+ `GET /api/v1/imports/[batch]`, `.../errores.xlsx`, `GET /api/v1/imports/templates/items|movements`)
- **Descripción:** importación estructurada XLSX/CSV con validación por fila (flujo `ARCHITECTURE.md` §4.6). **Unifase**: valida, persiste, resume y audita en una pasada (sin preview; el reintento no duplica por upsert/omisión).
- **Auth requerida:** Sí — `analista, contador` (`imports:create`; lectura `imports:read`).
- **Request schema:** `multipart/form-data` (`file` ≤ 10 MB, solo `xlsx/csv`). Plantillas con solo cabecera oficial. Movimientos referencian `cuenta_contable` (se resuelve al UUID dentro del ejercicio).
- **Response schema (éxito):** `{ "data": { "batch_id": "uuid", "filas_totales": 0, "filas_validas": 0, "filas_rechazadas": 0, "filas_duplicadas": 0, "errores_url": "/api/v1/imports/[batch]/errores.xlsx" } }`.
- **Errores posibles:** | 400 | extensión/tamaño, `?tipo` inválido, cabeceras faltantes | | 401 | sin sesión | | 403 | sin `imports:create` | | 404 | ejercicio ajeno/inexistente | | 422 | filas rechazadas (motivo por línea en `errores.xlsx`, reconstruido del lote) |
- **Efectos secundarios:** `import_batches` (`PROCESADO`/`FALLIDO`) + original en Blob y `files` + `IMPORT_CREATED` auditado.
- **Criterios de aceptación:** - [x] 120 filas (100 válidas + 20 con error) → resumen exacto con motivo por línea - [x] Reintento solo-corregidas no duplica (upsert por cuenta; movimientos exactos omitidos)

### `POST /api/v1/fiscal-items/[id]/movements` · `GET /api/v1/fiscal-items/[id]/movements`
- **Descripción:** registra y lista movimientos (`ADQUISICION…CORRECCION`).
- **Auth requerida:** Sí — `analista, contador`.
- **Request schema:** `{ tipo: enum, fecha: ISO (dentro del ejercicio), valor: decimal-string(18,2), documento_soporte_id: uuid.nullable() }`.
- **Errores posibles:** | 422 | fecha fuera del ejercicio o baja mayor al saldo |
- **Criterios de aceptación:** - [x] Movimiento con fecha de otro ejercicio → `422` - [x] Baja mayor al saldo → `422` con cifra disponible - [ ] Cada movimiento guarda `indice_base/cierre` y `factor` aplicados (lo fija el motor en Fase 5; columnas ya existen)

## Cálculos

### Server Actions `executeCalculationAction` / `submit` / `approve` / `annulCalculationAction`
- **Descripción:** ejecuta el motor puro (`src/services/calculation/`, ADR-008) y persiste cálculo + `calculation_results` con `version_reglas/indices`; flujo con revisión obligatoria.
- **Auth requerida:** Sí — ejecutar/enviar: `analista, contador`; aprobar/anular: `contador, asesor`.
- **Efectos secundarios:** `CALCULADO→PENDIENTE→APROBADO` (+`ANULADO`); snapshot en `fiscal_items` **solo al aprobar** (`DATABASE.md` §7.1); ejecutar admite `ABIERTO` y `REABIERTO` (§6.4).
- **Criterios de aceptación:** - [x] Sin índices del mes de cierre → error que nombra mes/año faltante (DOMAIN.md §6.2) - [x] Dos ejecuciones con mismos insumos dan idéntico resultado (`inpc-sha` determinista)

### `POST /api/v1/adjustment-calculations/[id]/submit` · `.../approve` · `.../annul`
- **Descripción:** `CALCULADO→PENDIENTE_DE_REVISION` (enviar), `→APROBADO` (fija `aprobado_por/en` + snapshot transaccional en partidas) o `→ANULADO` con motivo; el aprobado jamás se edita, se recalcula (ADR-009).
- **Auth requerida:** Sí — enviar/ejecutar: `analista, contador`; aprobar/anular: `contador, asesor`.
- **Errores posibles:** | 409 | aprobar sin revisión, doble aprobación, anular aprobado |
- **Efectos secundarios:** `CALC_SUBMITTED/APPROVED/ANNULLED` auditados con antes/después; snapshot solo al aprobar.
- **Criterios de aceptación:** - [x] Anular exige motivo ≥ 10 caracteres auditado - [x] Tras aprobar, `valor_fiscal_actualizado` + `ajuste_acumulado` visibles en partidas

### `GET /api/v1/adjustment-calculations/[id]` (detalle + `results`)
- **Descripción:** cálculo con resultados por partida (`valor_base`, índices, `factor`, `valor_actualizado`, `ajuste`) para la futura API v2.
- **Auth requerida:** Sí — todos los roles con `calculations:read` (propiedad de empresa).
- **Criterios de aceptación:** - [x] Incluye `version_reglas` (`reglas@v1.0.0`) y `version_indices` (`inpc-sha` determinista)

## Reportes y archivos

### `GET /api/v1/exports/[id]/[report]/[format]` (`report` = balance|worksheet|consolidado, `format` = xlsx|pdf|csv)
- **Descripción:** Balance General Fiscal Actualizado + hoja de trabajo + consolidados, con metadatos (fecha, usuario, versión de reglas/índices). Ruta única parametrizada en vez de 9 rutas fijas (decisión de diseño Fase 6; el contrato `/exports/balance/[id].xlsx` original se confirma-corrije aquí).
- **Auth requerida:** Sí — `calculations:read` (todos los roles con acceso a la empresa).
- **Errores posibles:** | 404 | cálculo inexistente/ajeno, reporte o formato inexistente | | 409 | cálculo no aprobado (solo se exporta lo aprobado) |
- **Efectos secundarios:** descarga auditada (`FILE_DOWNLOADED` con `{report, format}`).
- **Criterios de aceptación:** - [x] Exportar borrador → `409`, no archivo parcial - [x] El XLSX reimportado cuadra al centavo con `calculation_results` (verificado por relectura en tests)

### `GET /api/v1/files/[id]` · `POST /api/v1/uploads`
- **Descripción:** descarga y subida de soportes (Blob privado, 20 MB, allowlist `xls/xlsx/csv/pdf/docx`, nombre saneado).
- **Auth requerida:** Sí — propietario o `admin`.
- **Criterios de aceptación:** - [ ] URL firmada de corta duración, nunca pública permanente - [ ] Archivo ajeno → `404`

## Auditoría (solo lectura)

### `GET /api/v1/audit-logs?entidad_tipo=&entidad_id=&desde=&hasta=`
- **Descripción:** historial append-only por entidad/usuario/acción (índice compuesto `entidad_tipo+entidad_id`).
- **Auth requerida:** Sí — `admin, auditor, asesor, contador` (el `auditor` solo lee, jamás muta).
- **Criterios de aceptación:** - [ ] Sin `UPDATE`/`DELETE` expuestos para este recurso - [ ] `metadata` nunca incluye contraseñas, tokens ni PII sensible

---

## Fase M — MVP de recolección (implementación real, documentada 2026-09-26)

Levantamiento de requerimientos en 5 secciones con adjuntos. Roles vigentes: `ADMIN` / `RESPONDENT` (migración a 5 roles en Fase 1, `TODO.md`). Convención de verificación: `- [x]` verificado en código, `- [ ]` pendiente de ejecución/tests (Paso 04).

### `POST /api/submissions`
- **Descripción:** crea un levantamiento (`IN_PROGRESS`, `currentSection: 1`) más sus 5 secciones en `DRAFT` (`src/app/api/submissions/route.ts`, dominio `src/lib/domain/submissions.ts`).
- **Auth requerida:** Sí — cualquier rol autenticado.
- **Request schema:** ninguno (sin cuerpo).
- **Response schema (éxito):** `201 { "data": { "id": "cuid" } }` (envolvente convenida; D-M1 resuelta 2026-09-26).
- **Errores posibles:** | 401 | sin sesión (`UNAUTHENTICATED`) | | 500 | genérico `INTERNAL_ERROR`, detalle solo en logs del servidor (D-M2 resuelta 2026-09-26) |
- **Efectos secundarios:** `SUBMISSION_CREATED` en `audit_logs` con IP/user-agent.
- **Criterios de aceptación:** - [x] Crea exactamente 5 secciones `DRAFT` con `answers: {}` - [ ] Reintento/doble clic no duplica (sin idempotencia hoy)

### Server Actions `createSubmissionAction` / `createSubmissionFromClient` / `navigateToSubmission` / `deleteSubmissionAction`
- **Descripción:** variantes de creación (redirect vs retorno de `id` para Client Components con `useTransition`), navegación y borrado (`src/actions/submissions.ts`).
- **Auth requerida:** Sí — crear/navegar: cualquier rol; borrar: dueño o `ADMIN` (`submission.userId !== user.id` → error).
- **Errores posibles:** `No autenticado` / `Levantamiento no encontrado` / `No autorizado` (excepciones, no códigos HTTP por ser Actions).
- **Efectos secundarios:** borrado elimina blobs asociados (best-effort), `revalidatePath("/dashboard")` y `/admin/levantamiento` (antes `/admin/submissions`; esa ruta hoy solo redirige). Auditoría con acción propia `SUBMISSION_DELETED` (D-M3 resuelta 2026-09-26; migración `20260926000002_submission_deleted`).
- **Criterios de aceptación:** - [x] BorrarSubmission ajeno como `RESPONDENT` es rechazado - [ ] Borrar sin token Blob no deja Blobs huérfanos en producción

### Server Actions `saveDraftAction` / `submitSectionAction` (`src/actions/sections.ts`, dominio `src/lib/domain/sections.ts`)
- **Descripción:** guarda borrador (sin validación estricta, `version++`; rechaza si `SUBMITTED`) y envía sección (valida con `sectionNSchema`, persiste, avanza progreso).
- **Auth requerida:** Sí — dueño o `ADMIN` (`assertOwnership`); reenviar `SUBMITTED` → error.
- **Request schema:** `(submissionId: cuid, sectionNumber: 1–5, answers: unknown)`; retorno `{ok, message, issues?: [{path, message}]}`.
- **Reglas de envío:** Zod por sección (S1–S5, ver abajo); sección 3 exige **≥ 2 casos** persistidos en `calculation_cases` dentro de una **transacción** (borra previos e inserta); todas enviadas ⇒ `COMPLETED` + `completedAt`.
- **Efectos secundarios:** `SECTION_DRAFT_SAVED` / `SECTION_SUBMITTED` auditados; `revalidatePath` de submission y dashboard.
- **Criterios de aceptación:** - [x] Borrador parcial guarda sin validar; envío valida estricto con `issues` por campo - [x] Sección 3 con 1 caso es rechazada - [ ] Enviar dos veces la misma sección no duplica casos (transacción lo evita; validar en ejecución)

### Server Actions `reopenSectionAction` / `reopenSectionFormAction`
- **Descripción:** `SUBMITTED → REOPENED` con `version++` (wrapper `FormData`: `submissionId`, `sectionNumber`).
- **Auth requerida:** Sí — solo `ADMIN`.
- **Efectos secundarios:** `SECTION_REOPENED` auditado; revalida vista de submission y de admin.
- **Criterios de aceptación:** - [x] `RESPONDENT` recibe `No autorizado` - [ ] Reabrir sección inexistente responde error accionable (hoy `Sección no encontrada`)

### `POST /api/uploads` (`src/app/api/uploads/route.ts`)
- **Descripción:** subida de soporte como `multipart/form-data` (`file`, `submissionId`, `sectionNumber`, `category`).
- **Auth requerida:** Sí — dueño del levantamiento o `ADMIN` (ajeno → `403`).
- **Validación server-side:** extensiones `xls/xlsx/csv/pdf/docx`, tope 20 MB (`400`), `submissionId` existente (`404`); nombre saneado `[^a-zA-Z0-9._-]` y pathname único `submissions/{id}/section-{n}/{categoría}/{ts}-{nombre}`.
- **Response schema:** `{ "data": { "attachment": {...} } }`; errores con envolvente `{ "error": { "code", "message" } }` (`UNAUTHENTICATED`/`VALIDATION_ERROR`/`NOT_FOUND`/`FORBIDDEN`/`STORAGE_ERROR`). D-M1 resuelta 2026-09-26 (clientes `create-button` y `file-uploader` migrados a la envolvente).
- **Efectos secundarios:** Blob privado (`access: "private"`, sin token → `blob://local` solo desarrollo) + `registerAttachment` + `FILE_UPLOADED` con `{category, originalName, sizeBytes}`.
- **Criterios de aceptación:** - [x] `.exe` de 1 KB → `400 Extensión no permitida` - [x] PDF de 21 MB → `400` - [ ] Sin `BLOB_READ_WRITE_TOKEN` el aviso `local://` nunca llega a producción (verificar env en Vercel)

### Server Actions `registerAttachmentAction` / `deleteAttachmentAction` (`src/actions/attachments.ts`)
- **Descripción:** registro validado en servidor (no confía en el pathname del cliente) y borrado lógico (`deletedAt`) + `deleteFromBlob` best-effort.
- **Auth requerida:** Sí — registro: dueño o `ADMIN`; borrado: dueño, quien lo subió o `ADMIN`.
- **Request schema:** `CreateAttachmentInput` (`src/lib/domain/attachments.ts`: ext normalizada, 20 MB, `pathname`/`blobUrl`/`submissionId` obligatorios).
- **Efectos secundarios:** `FILE_UPLOADED` / `FILE_DELETED` auditados; `revalidatePath` de la submission.
- **Criterios de aceptación:** - [x] Borrado es lógico (`deletedAt`), el binario se intenta borrar best-effort - [ ] Adjunto con `deletedAt` jamás se sirve (`canAccessAttachment` lo excluye; validar en ejecución)

### `GET /api/files/[id]` (`src/app/api/files/[id]/route.ts`)
- **Descripción:** descarga con verificación de acceso + auditoría; hace proxy del binario desde Blob privado (`Content-Disposition: attachment`, `Content-Type` y `Content-Length` reales).
- **Auth requerida:** Sí — `ADMIN`, dueño o quien lo subió (`canAccessAttachment`); inexistente o ajeno → `403 "No autorizado o no encontrado"` (anti-enumeración).
- **Variantes:** `blobUrl local://` (dev sin token) → `200` con mensaje + metadata; sin token o fallo de proxy → `200` con metadata del adjunto.
- **Efectos secundarios:** `FILE_DOWNLOADED` con IP/user-agent **antes** de servir.
- **Criterios de aceptación:** - [x] Id ajeno como `RESPONDENT` → `403`, no `404` distinguible - [ ] Binario grande se transmite por stream sin cargarlo entero en memoria (revisar `res.body` en ejecución)

### `GET /api/export/[id]` (`src/app/api/export/[id]/route.ts`)
- **Descripción:** exporta el levantamiento integral como JSON con `Content-Disposition: attachment` (`levantamiento-{id}.json`): formato `sairfi/levantamiento-ajuste-inflacion-fiscal v1.0`, secciones con títulos/descripciones en español, casos normalizados (`inpc` como string), adjuntos con `urlDescarga: /api/files/{id}`, `resumenAgente` listo para contexto LLM y bloque de compatibilidad (`submission/sections/attachments` en inglés).
- **Auth requerida:** Sí — dueño o `ADMIN` (`404` inexistente, `403` ajeno).
- **Efectos secundarios:** descarga auditada como `FILE_DOWNLOADED` (entidad `FormSubmission`, `metadata.format: sairfi/levantamiento-json`) con IP/user-agent (D-M4 resuelta 2026-09-26).
- **Criterios de aceptación:** - [x] Incluye las 5 secciones ordenadas con `estadoDescripcion` en español - [ ] JSON de 5 secciones + 20 adjuntos descarga < 5 s en Preview

### Schemas de secciones (válidos al enviar; borrador admite parcial)
- **S1** (`section-1.ts`): `objective` 30–500, `userTypes[]` (Administrador, Analista contable, Contador, Asesor tributario, Supervisor, Cliente final, Auditor, Otro + `otherUserType` si Otro), `permissions` 30–1000.
- **S2** (`section-2.ts`): alcance (`SCOPE_OPTIONS`), procesos (`PROCESS_OPTIONS`: ajuste inicial, reajuste regular, RAR, depreciación, patrimonio, inventarios, conciliación, …), partidas (`PARTIDA_OPTIONS`: activos fijos, inventarios, inmuebles, intangibles, capital, reservas, …).
- **S3** (`section-3.ts` + `calculation-case.ts`): orígenes (`DATA_ORIGINS`), fuente INPC (`INPC_SOURCES` + URL si externa + responsable `inpcApprover`), `criteria` 50–2000, `cases[]` **mínimo 2** con `identifier`, `initialBalances`, `date` válida, `inpc > 0` (máx. 4 decimales), `movements`, `expectedResult`, `ruleExplanation` (`otherCaseType` si tipo Otro).
- **S4** (`section-4.ts`): `reports[]` (`REPORT_OPTIONS`: hoja por partida, balance fiscal, RAR, conciliación, ISLR, …), volúmenes (`estimatedCompanies/Users/historicalYears ≥ 0`, `assetVolume`), controles (`multiCompany`, `auditTrail`, `periodLock`, `reviewFlow`, `backup`).
- **S5** (`section-5.ts`): `companyListText` (1–1000) + `validators` (1–500). Sin adjuntos obligatorios para enviar.

### Hallazgo H-M1 — carpetas `src/app/api/auth/login/` y `logout/` vacías (resuelto 2026-09-26)
- No contenían `route.ts`; el login/logout real son las Server Actions `loginAction`/`logoutAction` (`src/actions/auth.ts`).
- **Resolución:** carpetas eliminadas y `"/api/auth"` retirado de `PUBLIC_PATHS` en `src/proxy.ts` (ningún cliente las consumía).

### Deudas menores Fase M (resueltas 2026-09-26, se conservan como registro)
- **D-M1:** resuelta — `POST /api/submissions` y `POST /api/uploads` usan la envolvente convenida.
- **D-M2:** resuelta — el `500` responde `INTERNAL_ERROR` genérico.
- **D-M3:** resuelta — acción `SUBMISSION_DELETED` con migración aplicada y verificada en DB viva.
- **D-M4:** resuelta — `GET /api/export/[id]` audita la descarga.
