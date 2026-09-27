# SECURITY.md — SAIRFI

> Se llena en el Paso 05, antes de conectar cualquier dato o servicio sensible. No se negocia, sin importar qué tan simple parezca el proyecto.

## Gestión de secretos

- **Dónde viven las API keys / credenciales:** exclusivamente en variables de entorno. Nunca en el repo, nunca en el cliente (`NEXT_PUBLIC_*` solo para URLs públicas, jamás secretos).
- **Variables vigentes (ver `.env.example`):** `DATABASE_URL` (pooled, runtime), `DIRECT_URL` (directa, migraciones), `BLOB_READ_WRITE_TOKEN`, `APP_URL`, `NEXT_PUBLIC_SITE_URL`, `SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`, `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` (solo seed inicial).
- **Producción:** los valores reales viven en el dashboard de Vercel por entorno (Production / Preview / Development), según `ARCHITECTURE.md` §9. Los secretos de build (`src/lib/db/client.ts:19-23`) toleran `DATABASE_URL` ausente solo para no romper `next build`; en runtime la primera query falla con mensaje claro si sigue faltando.
- **Checklist:**
  - [x] `.env` está en `.gitignore` (`.gitignore:32-40`, con `!.env.example` versionado)
  - [x] Existe un `.env.example` sin valores reales (placeholders `user:password@host`, `vercel_blob_rw_...`, `admin@empresa.com` / `Cambiar123!` claramente ficticios)
  - [x] Las claves de producción no son las mismas que las de desarrollo (entornos separados en Vercel; `SESSION_COOKIE_NAME=__Host-session` solo exige `Secure` en producción, ver `src/lib/auth/session.ts:5-14`)

## Autenticación

- **Estrategia:** sesiones servidoras con cookie `httpOnly`. Sin JWT en `localStorage`/`sessionStorage` (decisión ADR-004 en `DECISIONS.md`).
  - Token aleatorio de 256 bits (`randomBytes(32)`, `src/lib/auth/session.ts:28-30`); en DB solo se guarda su hash SHA-256 (`tokenHash`, tabla `sessions` en `prisma/schema.prisma`).
  - Cookie `SESSION_COOKIE_NAME` (defecto `__Host-session`): `httpOnly: true`, `secure` en producción (o si el nombre lleva prefijo `__Host-`), `sameSite: "lax"`, `Path=/`, expira con la sesión (`src/lib/auth/session.ts:131-142`). En desarrollo se degrada el nombre sin prefijo para permitir `http://localhost`.
  - Control de acceso en dos capas: `src/proxy.ts` (chequeo optimista de presencia de cookie → redirect a `/login`, sin validar firma) + validación real en servidor vía `getSessionUser()` (lookup por `tokenHash`, expiración, `user.active`, limpieza de cookies huérfanas y `lastSeenAt` oportunista, `src/lib/auth/session.ts:50-108`).
- **Expiración de sesión/token:** `SESSION_TTL_DAYS` (defecto 7 días, `src/lib/auth/session.ts:14`). Sesión expirada o de usuario desactivado se elimina y se limpian cookies para evitar el bucle `/dashboard`↔`/login` documentado en `src/proxy.ts:34-36`.
- **Manejo de contraseñas:** `bcryptjs` con costo 12 (`src/lib/auth/password.ts`, `prisma/seed.ts:32`). Política actual: login `min 6 / max 128`, creación `min 8 / max 128`, email normalizado (`trim().toLowerCase()`, `src/lib/validation/auth.ts`, `src/actions/auth.ts:12-20`). Respuestas de login genéricas (`"Credenciales inválidas"`) para no enumerar usuarios. Sin política de complejidad (mayúsculas/símbolos) ni bloqueo por intentos — deuda cubierta en § Rate limiting y § Amenazas.
- **Cuentas iniciales y administración:** seed crea un único `ADMIN` desde `INITIAL_ADMIN_EMAIL/PASSWORD` si no existe (`prisma/seed.ts:10-38`). Crear/desactivar usuarios es solo `ADMIN` (`src/actions/auth.ts:63-65`, `111-114`), con protección contra auto-desactivación y auditoría `USER_CREATED` / `USER_DEACTIVATED` con IP y user-agent.

## Autorización — Matriz RBAC

Modelo vigente (Fase 1.2+, sembrado: 5 roles, 30 permisos, 80 asignaciones). Fuente de verdad ejecutable: `src/lib/auth/permissions.ts` (la consume `hasPermission()` y la importa `prisma/seed.ts`); esta tabla es su reflejo documental — si discrepan, manda el código. Controles disponibles: `requireSession()` (401), `requireRole([...])` y `requirePermission(recurso, accion)` (403) en `src/lib/auth/session.ts`; la sesión expone `roles[]` reales. Columna Especiales: aprobar/cerrar/reabrir/exportar según recurso.

| Rol | Recurso | Crear | Leer | Actualizar | Eliminar | Especiales |
|---|---|---|---|---|---|---|
| administrador | Todo (`*:*`) | ✅ | ✅ | ✅ | ✅ (lógico donde aplique) | aprobar, cerrar, reabrir, exportar |
| analista | Empresas, ejercicios | ❌ | ✅ | ❌ | ❌ | — |
| analista | Índices | ✅ (cargar) | ✅ | ❌ | ❌ | aprobar: ❌ (asesor/contador) |
| analista | Partidas y movimientos | ✅ | ✅ | ✅ | ❌ | — |
| analista | Cálculos | ✅ (ejecutar) | ✅ | ❌ | ❌ | aprobar: ❌ (contador/asesor) |
| analista | Reportes e importaciones | ✅ (imports) | ✅ | ❌ | ❌ | exportar reportes |
| analista | Levantamientos/adjuntos propios | ✅ | ✅ (propios) | ✅ | ✅ (adjuntos propios) | — |
| analista | Usuarios, auditoría | ❌ | ❌ | ❌ | ❌ | — |
| contador | = analista, más auditoría en lectura | ✅ | ✅ | ✅ | ✅ (adjuntos propios) | **crear/actualizar ejercicios**, **aprobar cálculos, cerrar ejercicios**, leer `audit_logs` |
| contador | Índices | ❌ | ✅ | ❌ | ❌ | **aprobar índices** |
| contador | Usuarios | ❌ | ❌ | ❌ | ❌ | — |
| asesor_tributario | Partidas, movimientos, reportes, imports, adjuntos, levantamientos | ❌ | ✅ | ❌ | ❌ | exportar reportes, leer `audit_logs` |
| asesor_tributario | Índices | ❌ | ✅ | ❌ | ❌ | **aprobar índices** |
| asesor_tributario | Cálculos | ❌ | ✅ | ❌ | ❌ | **aprobar cálculos** |
| asesor_tributario | Ejercicios | ❌ | ✅ | ✅ | ❌ | **cerrar y reabrir** |
| asesor_tributario | Usuarios | ❌ | ❌ | ❌ | ❌ | — |
| auditor | Todo lo fiscal + levantamientos/adjuntos + auditoría | ❌ | ✅ | ❌ | ❌ | exportar reportes; jamás muta |
| auditor | Usuarios | ❌ | ❌ | ❌ | ❌ | — |
| No autenticado | `/`, `/login` | ❌ (solo login) | ❌ | ❌ | ❌ | — |

Puente legacy (Fase M, sigue activo): el campo `SessionUser.role` (`ADMIN` ≡ tiene `administrador`, resto ≡ `RESPONDENT`) aún gobierna los chequeos `!== 'ADMIN'` existentes — comportamiento idéntico al anterior, verificado por la suite. El código fiscal nuevo (Fase 1.3+) debe usar `requireRole`/`requirePermission`, nunca el campo legacy.

Regla transversal: toda Server Action y Route Handler llama a `getSessionUser()` primero y devuelve `401` sin sesión / `403`–`404` sin propiedad o rol (`401` en `src/app/api/uploads/route.ts:12`, `403` en `:30`, `notFound()` en páginas de submissions). El `proxy` **no sustituye** esta verificación (es solo optimista).

## Validación de inputs

- **Dónde se valida:** en el servidor siempre; el cliente solo duplica para UX. Nunca se confía solo en el cliente.
- **Herramienta:** Zod en el límite del sistema (`src/lib/validation/`: `auth.ts`, `calculation-case.ts`, `attachment.ts`, `section-1..5.ts`). Tipos inferidos (`z.infer`), sin `any`.
  - Auth: `loginSchema` / `createUserSchema` (email ≤ 254, password 6–128 / 8–128, rol enum).
  - Casos de cálculo: `calculationCaseSchema` (identificador ≤ 200, `INPC > 0` con ≤ 4 decimales, fecha válida, `otherCaseType` obligatorio si `caseType === "Otro"`).
  - Secciones 1–5 y adjuntos con schemas dedicados.
- **Sanitización de datos de usuario antes de:**
  - **Renderizado (XSS):** React escapa por defecto; no hay `dangerouslySetInnerHTML`. Mensajes de error genéricos al usuario, detalle técnico solo en logs del servidor.
  - **Queries (inyección):** todo acceso a datos vía Prisma (`src/lib/db/client.ts`, singleton con adaptador Neon). Sin SQL crudo concatenado.
  - **Archivos subidos:** allowlist de extensiones `xls/xlsx/csv/pdf/docx` + tope 20 MB + verificación de tamaño/extensión en servidor (`src/app/api/uploads/route.ts:7-26`, `src/lib/validation/attachment.ts:28-32`); nombre saneado (`replace(/[^a-zA-Z0-9._-]/g, "_")`) y pathname único `submissions/{id}/section-{n}/{categoría}/{ts}-{nombre}` (`route.ts:32-34`); almacenamiento privado en Vercel Blob (`access: "private"`, `addRandomSuffix`), con fallback local solo en desarrollo sin token (`src/lib/storage/blob.ts`).

## Rate limiting

Implementado 2026-09-26 (`src/lib/security/rate-limit.ts`, suite en verde). Desviaciones honestas del plan: `loginAction` devuelve mensaje (las Actions no tienen 429) y sin fila de auditoría (FK obligatoria sin usuario conocido; solo `console.warn` servidor); límite global en `src/proxy.ts` (100 req/min/IP). Límite conocido: store en memoria por instancia — en Vercel multinstancia la ruta de mejora es KV distribuido (backlog).

| Endpoint / grupo | Límite | Ventana | Acción al exceder |
|---|---|---|---|
| `loginAction` | 5 intentos | 10 min / IP + email | mensaje genérico + warn servidor |
| `POST /api/uploads` | 20 subidas | 10 min / usuario | 429 + `Retry-After` |
| `GET /api/export/[id]`, `GET /api/files/[id]`, `GET /api/v1/exports/*` | 30 descargas | 10 min / usuario | 429 + `Retry-After` |
| `/api/*` global (abusos) | 100 req | 1 min / IP | 429 + log |

## Otros controles

- [x] HTTPS forzado en producción (Vercel lo provee por defecto; cookies `Secure` en producción; Neon exige `sslmode=require` en ambas URLs)
- [x] Headers de seguridad configurados — `headers()` en `next.config.ts` (HSTS solo prod; CSP sin `unsafe-eval`; `frame-ancestors 'none'`), verificado por test y e2e.
- [x] CORS configurado explícitamente (no `*` en producción) — aplica por omisión: no hay `Access-Control-Allow-Origin: *`; las APIs son mismo-origen con cookie (`sameSite: lax`) y chequeo de sesión. Mutaciones `/api/*` exigen además `Origin` válido o ausente (`src/lib/security/origin.ts`, verificado con tests); Server Actions cubiertas por el CSRF del framework. Si se abre `/api/v1` a sistemas contables (v2), exigirá allowlist de orígenes + tokens API con alcance (ver `ARCHITECTURE.md` §8).
- [x] Logs no exponen datos sensibles — `audit.ts` solo persiste `metadata` curada (p. ej. `{ email, role }`, `{ category, originalName, sizeBytes }`) más `ipAddress`/`userAgent`; los catch hacen `console.error("[audit] failed", e)` sin volcar tokens ni hashes. Los errores al usuario son genéricos.
- [x] Backups de base de datos configurados y probados — respaldo automático de Neon (retención 30 días, ver `ARCHITECTURE.md` §9.4) + transacciones Prisma + `audit_logs` inmutables y retención tributaria de 10 años (`DATABASE.md` §6). **Drill 2026-09-26: restauración completa probada** — DB scratch `sairfi_restore_test` reconstruida solo con `prisma/migrations/*`, datos copiados tabla por tabla con `psql \copy`, conteos 20/20 idénticos, DB eliminada. Límite del entorno: `pg_dump` 16 no vuelca PG 18 (se usó `psql` + migraciones); runbook: ante pérdida, `CREATE DATABASE` + aplicar migraciones en orden + `COPY` desde el último volcado + verificar conteos, o PITR de Neon a una rama nueva.

## Amenazas conocidas y mitigación

| Amenaza | Probabilidad | Mitigación aplicada |
|---|---|---|
| Fuerza bruta / credential stuffing en login | Alta | bcrypt cost 12, mensajes genéricos, `lastLoginAt` + auditoría `LOGIN`; rate limiting 5/10min por IP+email activo |
| Robo de sesión (XSS / red) | Media | Cookie `httpOnly` + `Secure` en prod + `sameSite: lax`, solo hash en DB, expiración y revocación; CSP + HSTS activos |
| CSRF en Server Actions / `POST /api/*` | Media | `sameSite: lax` + verificación de `Origin` en mutaciones `/api/*` (testeada) + CSRF del framework en Actions |
| IDOR: leer/editar submissions o adjuntos ajenos | Media | Chequeos de propiedad en cada acción, ruta y página (`submission.userId !== user.id` → 403/`notFound()`); ADMIN exceptuado explícitamente |
| Subida maliciosa (ejecutables, zip-bombs, MIME spoofing) | Media | Allowlist + 20 MB + nombre saneado + Blob privado; **falta** verificación mágica de firma/MIME estricta y escaneo antivirus antes de servir |
| Exposición de PII / datos tributarios en logs o exportaciones | Media | `audit_logs` con metadatos mínimos, sin contraseñas/tokens; exportaciones exigen sesión y propiedad; **falta** revisión de `metadata` libre (`Json`) para que nunca guarde PII sensible |
| Abuso de exportaciones/descargas (scraping, DoS) | Media | Requieren sesión + rate limiting 30/10min por usuario y global 100/min por IP |
| `.env` o backups filtrados al repo | Baja | `.gitignore` ignora `.env*` salvo `.env.example`; `DATABASE_URL` con `sslmode=require`; secretos prod solo en Vercel |
| Pérdida de datos / corrupción fiscal | Baja | Transacciones Prisma, `audit_logs` append-only, respaldo Neon, borrado lógico (`active=false`) en lugar de borrado físico |
