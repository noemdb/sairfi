## 0. Registro de mejoras de esta revisión (2026-09-26, v2)

| # | Problema detectado en la versión anterior | Corrección aplicada |
|---|---|---|
| 1 | §9.2 listaba variables de entorno (`SESSION_SECRET`, `SMTP_HOST/PORT/USER/PASS`) que no coinciden con las documentadas en `SECURITY.md` (`SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`, `INITIAL_ADMIN_EMAIL/PASSWORD`, `BLOB_READ_WRITE_TOKEN`, `APP_URL`, `NEXT_PUBLIC_SITE_URL`), y no existe todavía envío de correo en el código (`TODO.md` no lo lista como implementado). | §9.2 reescrita para reflejar exactamente las variables de `SECURITY.md`; las variables de notificación por correo se marcan explícitamente como **futuras, no implementadas**. |
| 2 | §13 mostraba un `getSession()`/`requireAuth()` genérico que no refleja el diseño real de dos capas descrito en `SECURITY.md` (proxy optimista + `getSessionUser()` con `tokenHash`). Alguien que implementara siguiendo solo este documento reconstruiría una guarda más débil que la que ya existe. | §13 reescrita para mostrar la capa de proxy optimista y `getSessionUser()` como la verificación real, citando explícitamente que el proxy nunca sustituye al segundo chequeo. |
| 3 | §4.1 mostraba un único árbol de carpetas "objetivo" (empresas, ejercicios, motor de cálculo) sin indicar que el código de Fase M (auth, submissions, uploads, admin) tiene una estructura distinta y es lo único que existe hoy. | Se agrega §4.1 bis con la estructura real de Fase M y una nota cruzada a `CONVENTIONS.md` §1, que ahora documenta ambas. |
| 4 | §4.2 listaba 5 roles (Administrador/Analista/Contador/Asesor/Auditor) como si ya existieran, cuando `SECURITY.md` documenta que el MVP solo implementa 2 (`ADMIN`/`RESPONDENT`) y que la ampliación a 5 es deuda explícita. | Se aclara en §4.2 cuál modelo rige hoy y cuál es el objetivo, con referencia a `TODO.md` B-01. |
| 5 | La nota sobre `PROJECT.md` § Contexto (PHP/Laravel) quedaba como comentario aislado sin apuntar al bloqueo formal. | Se referencia explícitamente **B-02** de `TODO.md` (resuelto 2026-09-26 al actualizar `PROJECT.md`). |

***

## 1. Visión general de la arquitectura

SAIRFI es un sistema web de arquitectura **monolítica modular** construida sobre **Next.js 16.x (App Router) + React 19.x + TypeScript + Tailwind CSS 4.x**, con **Prisma ORM 7.x** sobre **PostgreSQL en Neon.tech** y despliegue en **Vercel**. La arquitectura prioriza:

- **Trazabilidad completa** de cálculos, índices y reglas.
- **Seguridad y auditoría** de operaciones sensibles.
- **Extensibilidad** para incorporar módulos de compras, ventas, IVA y retenciones en la versión 2.0.
- **Automatización de cálculos** con validaciones y controles de integridad.
- **Separación clara** entre el motor de cálculo fiscal y las capas de presentación e importación/exportación.

> **Nota de coherencia (2026-09-26):** `PROJECT.md` § Contexto mencionaba PHP/Laravel/VPS como restricción original; el stack vigente es el de este documento por ADR-001 (`DECISIONS.md`). B-02 resuelto el mismo día al actualizar `PROJECT.md`.

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Capa de presentación                     │
│   (Next.js App Router + React Server Components + Tailwind)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Capa de aplicación                          │
│  (Server Actions, Route Handlers, servicios de dominio, jobs)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Capa de datos                             │
│      (Prisma ORM + PostgreSQL en Neon.tech + almacenamiento)     │
└─────────────────────────────────────────────────────────────────┘
```

***

## 2. Principios arquitectónicos

### 2.1. Monolito modular

Se evita una arquitectura de microservicios para la versión 1.0 debido a:

- Complejidad operativa innecesaria.
- Volumen de transacciones moderado.
- Necesidad de trazabilidad transaccional completa.
- Recursos limitados de infraestructura.

El monolito se organiza en módulos funcionales dentro de `src/app`. La distribución de módulos de esta sección corresponde al **modelo objetivo de Fase 1+**; la estructura que existe hoy en código (Fase M) se documenta en §4.1 bis.

```text
src/app
  /(public)
    /login
    /register
  /(protected)
    /dashboard
    /companies
    /fiscal-periods
    /price-indices
    /fiscal-items
    /calculations
    /reports
    /imports
    /settings
  /api
    /v1
      /companies
      /fiscal-periods
      /price-indices
      /fiscal-items
      /calculations
      /reports
      /imports
```

Cada módulo contiene:

- Server Components.
- Client Components (solo donde haya interactividad real).
- Server Actions.
- Validaciones con Zod.
- Tipos TypeScript inferidos.

### 2.2. Separación de responsabilidades

```text
Presentación (Server Components + Client Components)
  ↓
Server Actions / Route Handlers
  ↓
Servicios de aplicación
  ↓
Servicios de dominio (motor de cálculo)
  ↓
Repositorios Prisma
  ↓
Base de datos PostgreSQL
```

La capa de dominio **no conoce** la capa de presentación. Los motores de cálculo son funciones puras o servicios sin estado que reciben datos y devuelven resultados.

### 2.3. Trazabilidad por diseño

Cada cálculo, modificación o aprobación genera un registro en la tabla `audit_logs`. Los índices, reglas y cálculos se versionan para permitir reproducción histórica.

### 2.4. Seguridad desde el inicio

- Sesiones basadas en cookies `httpOnly`.
- Sin JWT en `localStorage` o `sessionStorage`.
- Control de acceso implementado en dos capas: `src/proxy.ts` (optimista) + guardas explícitas (`getSessionUser()`, `requireRole()`) en Server Components/Server Actions/Route Handlers — ver §13.
- Validación de inputs con Zod en todos los endpoints y formularios.
- Cifrado en tránsito (HTTPS por defecto en Vercel).
- Registro de eventos sensibles.

### 2.5. Preparado para ampliación

La arquitectura permite incorporar en la versión 2.0:

- Módulo de compras y ventas.
- Módulo de IVA y retenciones.
- Integración con sistemas externos mediante Route Handlers.
- Módulo de activos fijos e inventarios.

***

## 3. Stack tecnológico obligatorio

| Capa | Tecnología | Notas de uso obligatorias |
|---|---|---|
| **Framework** | **Next.js 16.x** | App Router únicamente. **Sin `middleware.ts`**: el control de acceso se implementa como una **capa de proxy** (ver §13) y guardas explícitas en Server Components/Server Actions/Route Handlers. |
| **UI runtime** | **React 19.x** | Server Components por defecto; Client Components solo donde haya interactividad real (formularios, tablas editables, wizards de cálculo). Usar `useActionState`/`useFormStatus` para formularios ligados a Server Actions. |
| **Lenguaje** | **TypeScript** (`strict: true`) | Prohibido `any` implícito. Todo contrato de datos (DTO) definido con `zod` y tipos inferidos (`z.infer<...>`). |
| **Estilos** | **Tailwind CSS 4.x** | Config basada en `@theme` (CSS-first). Sin CSS-in-JS. Componentes de UI reutilizables en `src/components/ui`. |
| **ORM** | **Prisma ORM 7.x** | Un único `schema.prisma` como fuente de verdad del modelo de datos (ver `DATABASE.md`). Cliente Prisma generado con output personalizado y consumido vía un singleton (`src/lib/db/client.ts`) para evitar múltiples conexiones en desarrollo. |
| **Base de datos** | **PostgreSQL sobre Neon.tech** | Usar el *pooled connection string* de Neon para runtime de la app (`DATABASE_URL`) y el *direct connection string* para migraciones (`DIRECT_URL`). Habilitar `previewFeatures` o adaptador acorde a la versión de Prisma para el *connection pooling* de Neon. |
| **Hosting/CI-CD** | **Vercel** | Despliegue de la app Next.js; variables de entorno gestionadas en el dashboard de Vercel por entorno (Production/Preview/Development). Los *cron jobs* de Vercel se usan para tareas programadas (p. ej. recordatorios de cierre de período), nunca para ejecutar el motor de cálculo completo si este puede exceder el timeout de la función. |
| **API interna** | **Route Handlers** (`app/api/.../route.ts`) y **Server Actions** | Ver criterio de uso en §4.3. |
| **Autenticación** | **Sesiones basadas en cookies `httpOnly`** | Token aleatorio de 256 bits; en DB solo se guarda su hash SHA-256 (`tokenHash`). Sin JWT en `localStorage`/`sessionStorage`. Ver diseño completo en §13 y en `SECURITY.md`. |

***

## 4. Componentes principales

### 4.1. Frontend (estructura objetivo, Fase 1+)

**Tecnologías:**

- Next.js 16.x App Router.
- React 19.x Server Components.
- Tailwind CSS 4.x.
- Zod para validación de esquemas.

**Responsabilidades:**

- Renderizar interfaces de usuario.
- Capturar y validar datos de formularios.
- Mostrar reportes y exportaciones.
- Gestionar estados de carga, error y éxito.
- Navegación entre módulos.

**Estructura de carpetas (objetivo — ver §4.1 bis para lo que existe hoy):**

```text
src/
  app/
    (public)/
      login/
        page.tsx
      register/
        page.tsx
    (protected)/
      dashboard/
        page.tsx
      companies/
        page.tsx
        [id]/
          page.tsx
      fiscal-periods/
        page.tsx
      fiscal-items/
        page.tsx
      calculations/
        page.tsx
      reports/
        page.tsx
      imports/
        page.tsx
    api/
      v1/
        companies/
          route.ts
        fiscal-periods/
          route.ts
        calculations/
          route.ts
  components/
    ui/
      button.tsx
      input.tsx
      table.tsx
      modal.tsx
    forms/
      company-form.tsx
      fiscal-item-form.tsx
    tables/
      fiscal-items-table.tsx
    charts/
      adjustment-summary.tsx
  lib/
    auth/         # sesión, guardas require*, hashing, auditoría
    db/
      client.ts   # singleton Prisma (Neon)
    validation/   # schemas Zod por dominio
    utils.ts
  services/
    company.service.ts
    fiscal-item.service.ts
    calculation.service.ts
  types/
    index.ts
    fiscal.ts
    calculation.ts
```

### 4.1 bis. Frontend — estructura real hoy (Fase M, MVP de recolección)

Lo único que existe en el repo actualmente. Reconstruida a partir de `SECURITY.md` y `TODO.md` (ver también `CONVENTIONS.md` §1.1, que es la fuente canónica de este árbol).

```text
src/
  app/
    login/ · register/          # o agrupados en (public)/
    dashboard/
    submissions/[id]/
    admin/
      users/
      levantamiento/   # gestión de levantamientos (antes submissions/; esa ruta hoy solo redirige)
      audit/
    api/
      auth/login/ · auth/logout/   # H-M1: carpetas vacías, resolver (backlog TODO.md)
      uploads/route.ts              # 20 MB, allowlist, Blob privado
      export/[id]/route.ts
      files/[id]/route.ts
  actions/
    auth.ts · submissions.ts · sections.ts · attachments.ts
  lib/
    auth/session.ts · password.ts
    domain/submissions.ts · attachments.ts
    storage/blob.ts
    validation/auth.ts · attachment.ts · section-1..5.ts
    audit.ts
    db/client.ts
  proxy.ts
```

No existen todavía `companies/`, `fiscal-periods/`, `fiscal-items/`, `calculations/`, etc. — esos módulos aparecen recién en Fase 1 (`TODO.md`), una vez resuelto el bloqueo B-01.

### 4.2. Autenticación y autorización

**Implementación:**

- Sesiones basadas en cookies `httpOnly`.
- Sin JWT en `localStorage` o `sessionStorage`.
- Control de acceso en dos capas: `src/proxy.ts` (optimista) + `getSessionUser()` (real) — ver §13.

**Características:**

- Registro e inicio de sesión.
- Gestión de sesiones activas (expiración `SESSION_TTL_DAYS`, limpieza de cookies huérfanas).
- Roles y permisos.
- Guardas en Server Components y Server Actions.

**Roles — vigentes hoy (Fase M) vs. objetivo (Fase 1+):**

| Modelo | Roles | Estado |
|---|---|---|
| **MVP (implementado)** | `ADMIN`, `RESPONDENT` | En producción; ver matriz completa en `SECURITY.md` §Autorización |
| **Objetivo (Fase 1+)** | Administrador, Analista, Contador, Asesor tributario, Auditor | No implementado; ampliar es deuda explícita (`SECURITY.md`, `TODO.md` B-01) |

| Rol (objetivo) | Permisos principales |
|---|---|
| **Administrador** | Gestionar empresas, usuarios, índices, parámetros globales. |
| **Analista** | Cargar datos, ejecutar cálculos preliminares, generar reportes. |
| **Contador** | Clasificar partidas, revisar cálculos, aprobar resultados. |
| **Asesor tributario** | Definir reglas, validar tratamientos fiscales, aprobar cierres. |
| **Auditor** | Consultar datos, historial y reportes sin modificar información. |

> No confundir con "recuperación de contraseña": no está implementada en el MVP ni aparece en `TODO.md`; si se necesita, añadir primero como bloque nuevo en `TODO.md` antes de documentarla aquí como si existiera.

### 4.3. API interna

**Route Handlers (`app/api/.../route.ts`):**

- Endpoints REST para integraciones externas (objetivo v2, ver §8).
- Importación y exportación de datos.
- Hoy (Fase M): `POST /api/uploads`, `GET /api/export/[id]`, `GET /api/files/[id]`.

**Server Actions:**

- Mutaciones de datos desde formularios.
- Cálculos y aprobaciones (objetivo Fase 1+).
- Hoy (Fase M): `loginAction`, `createUserAction`, `deactivateUserAction`, acciones de `submissions.ts`/`sections.ts`/`attachments.ts`.
- Operaciones que requieren autenticación y autorización.

**Criterio de uso:**

| Escenario | Tecnología recomendada |
|---|---|
| Formulario en componente | Server Action |
| Integración externa (API) | Route Handler |
| Importación de archivos | Server Action + Route Handler para descarga |
| Exportación de reportes | Route Handler |
| Cálculo asíncrono | Server Action + cola de Vercel (si aplica) |

### 4.4. Base de datos

**Tecnología:**

- Prisma ORM 7.x.
- PostgreSQL 18 en Neon.tech.

**Características:**

- Transaccionalidad ACID.
- Índices para consultas frecuentes.
- Restricciones de integridad referencial.
- Campos JSONB para metadatos configurables.
- Auditoría mediante `audit.ts` (Fase M) / triggers o eventos de modelo (objetivo Fase 1+).

**Conexión a Neon.tech:**

```env
# Runtime de la app (pooled connection)
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require&pgbouncer=true"

# Migraciones (direct connection)
DIRECT_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
```

**Esquema conceptual (objetivo, Fase 1+ — ver `DATABASE.md` §3 para el aviso de alcance completo):**

```text
companies
  ├── fiscal_periods
  │     ├── fiscal_items
  │     │     └── fiscal_movements
  │     ├── adjustment_calculations
  │     └── audit_logs
  ├── price_indices
  ├── users (a través de tabla intermedia company_user)
  └── audit_logs
```

El esquema realmente implementado hoy (Fase M: `users`, `sessions`, `form_submissions`, `sections`, `attachments`, `audit_logs`) es distinto y más simple; ver la nota de alcance al inicio de `DATABASE.md` §3.

### 4.5. Motor de cálculo fiscal (Fase 5, no iniciado)

**Ubicación:**

```text
src/services/calculation/
  initial-adjustment.calculator.ts
  regular-adjustment.calculator.ts
  adjustment-factor.calculator.ts
  fiscal-item.classifier.ts
  adjustment.consolidator.ts
```

**Responsabilidades:**

- Calcular factores de actualización.
- Calcular valores actualizados.
- Determinar ajustes individuales y consolidados.
- Validar integridad de cálculos.
- Generar resultados reproducibles.

**Características:**

- Funciones puras o servicios sin estado.
- Reciben datos y devuelven resultados.
- No acceden directamente a la base de datos (usan repositorios o DTOs).
- Permiten inyección de estrategias de cálculo (para futuras variantes normativas).
- Registran versión de reglas e índices aplicados.

**Flujo de cálculo inicial:**

```text
1. Obtener período fiscal.
2. Obtener índices aprobados.
3. Obtener partidas clasificadas (excluye estado = PENDIENTE_DE_CLASIFICACION, ver DOMAIN.md §6.1).
4. Para cada partida:
   a. Determinar índice base.
   b. Determinar índice de cierre.
   c. Calcular factor.
   d. Calcular valor actualizado.
   e. Calcular ajuste.
5. Consolidar por tipo y categoría.
6. Determinar efecto neto sobre patrimonio.
7. Guardar resultados y bitácora.
```

**Flujo de cálculo regular:**

```text
1. Obtener período fiscal anterior aprobado.
2. Obtener saldos fiscales actualizados.
3. Obtener movimientos del período.
4. Para cada partida existente:
   a. Determinar índice de cierre anterior.
   b. Determinar índice de cierre actual.
   c. Calcular factor del período.
   d. Calcular valor actualizado.
   e. Calcular reajuste.
5. Para cada movimiento:
   a. Determinar índice base del movimiento.
   b. Determinar índice de cierre actual.
   c. Calcular factor del movimiento.
   d. Calcular valor actualizado del movimiento.
6. Consolidar resultados.
7. Guardar resultados y bitácora.
```

### 4.6. Módulo de importación (Fase 4, no iniciado)

**Responsabilidades:**

- Leer archivos Excel o CSV.
- Validar estructura y datos.
- Transformar a modelos de dominio.
- Registrar lote de importación.
- Reportar errores por fila.

**Flujo:**

```text
1. Usuario carga archivo.
2. Sistema valida formato.
3. Sistema lee filas.
4. Para cada fila:
   a. Validar campos obligatorios.
   b. Validar tipos de dato.
   c. Validar reglas de negocio.
   d. Clasificar como válida o inválida.
5. Mostrar resumen.
6. Permitir descarga de errores.
7. Confirmar importación.
8. Registrar en base de datos.
9. Actualizar bitácora.
```

**Archivos soportados:**

- `fiscal_items_import_template.xlsx`
- `fiscal_movements_import_template.xlsx`
- Equivalentes en CSV.

Los formatos se documentan en `API.md` (Paso 03, por bloque de importación). El módulo de subida de adjuntos del MVP (`POST /api/uploads`) es un mecanismo distinto y ya implementado — allowlist `xls/xlsx/csv/pdf/docx`, 20 MB, ver `SECURITY.md`.

### 4.7. Módulo de reportes (Fase 6, no iniciado)

**Tecnologías:**

- Generación de Excel mediante librerías compatibles con Edge (p. ej. `exceljs`).
- Generación de PDF mediante librerías compatibles (p. ej. `@react-pdf/renderer` o servicio externo).

**Reportes principales:**

- Balance General Fiscal Actualizado (inicial y de cierre).
- Hoja de trabajo detallada por partida.
- Consolidado por cuenta contable.
- Consolidado por categoría fiscal.
- Resumen de ajustes por tipo de activo, pasivo y patrimonio.
- Efecto neto sobre patrimonio fiscal.
- Bitácora de cálculo.
- Índices aplicados.

**Características:**

- Plantillas configurables.
- Filtros por empresa, período y estado.
- Exportación a XLSX, PDF y CSV.
- Inclusión de metadatos (fecha, usuario, versión).

El MVP ya tiene un exportador distinto y más simple en `GET /api/export/[id]` (auditado, respeta propiedad) — no confundir con este módulo de reportes fiscales.

### 4.8. Módulo de auditoría

**Responsabilidades:**

- Registrar eventos sensibles.
- Almacenar valores anteriores y nuevos.
- Permitir consultas históricas.
- Generar reportes de auditoría.

**Eventos auditables (Fase M, implementados):** `LOGIN`, `USER_CREATED`, `USER_DEACTIVATED`, `FILE_UPLOADED`, `FILE_DELETED` (ver `SECURITY.md`).

**Eventos auditables (objetivo Fase 1+, adicionales):**

- Creación, modificación y eliminación de empresas.
- Apertura y cierre de ejercicios.
- Carga, modificación y aprobación de índices.
- Importación de saldos y movimientos.
- Clasificación y reclasificación de partidas.
- Ejecución de cálculos.
- Cambios de reglas.
- Aprobación de resultados.
- Reapertura de períodos.
- Exportación de reportes.
- Cambios de permisos.

**Estructura del registro:**

```typescript
interface AuditLog {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Date;
}
```

> Implementación real (`src/lib/audit.ts`): solo persiste `metadata` curada (p. ej. `{ email, role }`, `{ category, originalName, sizeBytes }`), nunca tokens ni hashes; los fallos hacen `console.error("[audit] failed", e)` sin interrumpir la operación principal.

***

## 5. Flujo de datos

> Los flujos §5.1 a §5.6 documentan el **modelo objetivo de Fase 1+**. Los flujos que ya existen en producción (login, envío de levantamiento, subida de adjunto, exportación) siguen el mismo patrón general (Server Component → Server Action/Route Handler → servicio → Prisma → `audit_logs`) pero sobre las entidades de Fase M (`form_submissions`, `sections`, `attachments`), no sobre `companies`/`fiscal_items`.

### 5.1. Registro de empresa y período

```text
Usuario (Administrador)
  → Server Component: /companies/page.tsx
  → Server Action: createCompanyAction()
  → Service: CompanyService.create()
  → Prisma: prisma.company.create()
  → AuditLog: prisma.auditLog.create()
  → revalidatePath('/companies')
  → Redirect a /companies
```

### 5.2. Carga de índices

```text
Usuario (Analista)
  → Server Component: /price-indices/page.tsx
  → Server Action: createPriceIndexAction()
  → Service: PriceIndexService.create()
  → Prisma: prisma.priceIndex.create()
  → AuditLog: prisma.auditLog.create()
  → Pendiente de aprobación (Asesor)
  → Server Action: approvePriceIndexAction()
  → AuditLog: prisma.auditLog.create()
```

### 5.3. Importación de partidas

```text
Usuario (Analista)
  → Client Component: ImportForm.tsx (useActionState)
  → Server Action: importFiscalItemsAction()
  → Service: FiscalItemImportService.import()
  → Validación de archivo
  → Lectura de filas
  → Para cada fila:
       → Validar campos con Zod
       → Transformar a DTO
       → Clasificar partida (sin fecha clara → PENDIENTE_DE_CLASIFICACION, DOMAIN.md §6.1)
       → Guardar o registrar error
  → Registrar lote de importación
  → AuditLog: prisma.auditLog.create()
  → revalidatePath('/fiscal-items')
  → Retornar resumen y errores
```

### 5.4. Cálculo de ajuste inicial

```text
Usuario (Analista)
  → Server Component: /calculations/initial/page.tsx
  → Server Action: calculateInitialAdjustmentAction()
  → Service: InitialAdjustmentService.calculate()
  → Calculator: InitialAdjustmentCalculator.calculate()
  → Obtener período, índices, partidas (excluyendo PENDIENTE_DE_CLASIFICACION)
  → Calcular factores, valores y ajustes
  → Consolidar resultados
  → Prisma: prisma.adjustmentCalculation.create()
  → AuditLog: prisma.auditLog.create()
  → Estado: PENDIENTE_DE_REVISION
  → Notificar a Contador (mecanismo de notificación aún no definido — no asumir email, ver §9.2)
```

### 5.5. Aprobación de cálculo

```text
Usuario (Contador/Asesor)
  → Server Component: /calculations/review/[id]/page.tsx
  → Server Action: approveCalculationAction()
  → Service: AdjustmentCalculationService.approve()
  → Validar estado
  → Prisma: prisma.adjustmentCalculation.update()
  → AuditLog: prisma.auditLog.create()
  → revalidatePath('/calculations')
  → Notificar a Analista (idem nota anterior)
```

### 5.6. Exportación de reporte

```text
Usuario (Analista)
  → Server Component: /reports/balance/page.tsx
  → Route Handler: GET /api/v1/exports/balance/[id]/xlsx
  → Service: BalanceReportService.generate()
  → Generator: BalanceReportGenerator.toXlsx()
  → Retornar archivo descargable
  → AuditLog: prisma.auditLog.create()
```

***

## 6. Estrategia de almacenamiento

### 6.1. Base de datos relacional

**Tablas del objetivo Fase 1+** (`DATABASE.md` §3):

- `companies`, `fiscal_periods`, `price_indices`, `fiscal_items`, `fiscal_movements`, `adjustment_calculations`, `calculation_results`, `import_batches`, `audit_logs`, `users`, `roles`, `permissions`, `company_user`, `role_user`, `permission_role`, `files`.

**Tablas implementadas hoy (Fase M):** `users` (con `role` enum `ADMIN`/`RESPONDENT`), `sessions`, `form_submissions`, `sections`, `attachments`, `audit_logs`.

### 6.2. Almacenamiento de archivos

**Ubicación:**

- Vercel Blob (`access: "private"`, `addRandomSuffix`) en producción — ya implementado (`src/lib/storage/blob.ts`).
- Local en desarrollo, solo si `BLOB_READ_WRITE_TOKEN` no está configurado.

**Archivos almacenados hoy:** adjuntos de levantamientos (`FILE_UPLOADED`), con nombre saneado y ruta `submissions/{id}/section-{n}/{categoría}/{ts}-{nombre}`.

**Archivos almacenados (objetivo Fase 1+, adicionales):**

- Archivos de importación originales.
- Archivos de exportación generados.
- Documentos de soporte adjuntos a partidas fiscales.
- Plantillas de reportes.

### 6.3. Cache

**Tecnología:**

- Vercel KV (Redis) o cache de Next.js (`unstable_cache`).

**Uso (objetivo Fase 1+ — no implementado hoy):**

- Cache de índices aprobados.
- Cache de configuraciones de empresa.
- Cache de reportes frecuentes (opcional).

***

## 7. Estrategia de colas y jobs

**Tecnología:**

- Vercel Cron Jobs para tareas programadas.
- Funciones serverless para procesamiento asíncrono.

**Jobs principales (objetivo Fase 1+ — ninguno implementado hoy):**

- `ProcessFiscalItemImport`
- `ProcessFiscalMovementImport`
- `CalculateInitialAdjustment` (si excede timeout, dividir en lotes)
- `CalculateRegularAdjustment` (si excede timeout, dividir en lotes)
- `GenerateBalanceReport`
- `GenerateWorksheetReport`
- `SendNotificationEmail` (depende de que se decida un proveedor de correo; hoy no hay ninguno configurado, ver §9.2)

**Consideraciones:**

- No ejecutar motores de cálculo completos en cron jobs si pueden exceder el timeout de la función.
- Para cálculos masivos, usar procesamiento por lotes o servicios externos.
- Monitorear funciones fallidas mediante logs de Vercel.

***

## 8. Integraciones externas (v2.0, backlog — ver `TODO.md`)

### 8.1. API REST para sistemas contables

**End points previstos:**

```text
GET    /api/v1/companies
GET    /api/v1/fiscal-periods
GET    /api/v1/fiscal-items
POST   /api/v1/fiscal-items/bulk
GET    /api/v1/adjustment-calculations/{id}/results
```

**Autenticación:**

- API tokens con alcance, gestionados en base de datos.
- Rate limiting mediante la implementación pendiente descrita en `SECURITY.md` §Rate limiting (no existe todavía; no confundir con `src/proxy.ts`, que es solo un chequeo optimista de cookie).

### 8.2. Webhooks (futuro)

**Eventos notificables:**

- `fiscal_period.closed`
- `adjustment_calculation.approved`
- `adjustment_calculation.rejected`
- `import_batch.completed`
- `import_batch.failed`

***

## 9. Despliegue e infraestructura

### 9.1. Entornos

| Entorno | Propósito | URL |
|---|---|---|
| **Desarrollo** | Desarrollo local del equipo. | `http://localhost:3000` |
| **Preview** | Pruebas de integración por PR. | `https://sairfi-git-branch.vercel.app` |
| **Production** | Sistema en uso real. | `https://sairfi.example.com` |

### 9.2. Variables de entorno

Estas son las variables **realmente usadas hoy** por el código (fuente de verdad: `SECURITY.md` §Gestión de secretos, `.env.example`). No inventar variables adicionales aquí sin agregarlas primero allá.

```env
# Base de datos
DATABASE_URL="postgresql://..."      # pooled, runtime
DIRECT_URL="postgresql://..."        # directa, solo migraciones

# Almacenamiento
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Aplicación / sesión
APP_URL="https://sairfi.example.com"
NEXT_PUBLIC_SITE_URL="https://sairfi.example.com"
SESSION_COOKIE_NAME="__Host-session"   # se degrada sin prefijo en desarrollo
SESSION_TTL_DAYS="7"

# Seed inicial (solo se usan una vez, al crear el primer ADMIN)
INITIAL_ADMIN_EMAIL="admin@empresa.com"
INITIAL_ADMIN_PASSWORD="Cambiar123!"
```

> **No implementado todavía:** envío de correo (`SMTP_*` o proveedor equivalente) para las notificaciones mencionadas en §5.4/§5.5/§7. Si se decide agregar notificaciones, documentar primero el proveedor elegido en `DECISIONS.md` y luego añadir las variables aquí y en `SECURITY.md` — no asumir SMTP por defecto.

### 9.3. CI/CD

**Herramientas:**

- GitHub Actions integrado con Vercel.
- Deploy automático por push a `main`.

**Pipeline básico:**

```text
1. Push a rama
2. Vercel crea deployment preview
3. Ejecutar pruebas (una vez instalados Vitest/MSW/Playwright, ver CONVENTIONS.md §7)
4. Merge a main
5. Vercel despliega a production
6. Ejecutar migraciones (prisma migrate deploy)
```

### 9.4. Respaldo y recuperación

**Estrategia:**

- Respaldo automático de Neon.tech (retención 30 días).
- Transacciones Prisma + `audit_logs` inmutables.
- **Pendiente:** prueba trimestral de restauración documentada (ver `SECURITY.md`).

***

## 10. Escalamiento y rendimiento

### 10.1. Estrategia de escalamiento

- **Vertical:** Aumentar recursos en Vercel (Hobby → Pro → Enterprise).
- **Horizontal:** Neon.tech maneja escalado automático de base de datos.

### 10.2. Optimizaciones previstas

- Índices en columnas de búsqueda frecuente (`company_id`, `fiscal_period_id`, `status`).
- Paginación de listados grandes.
- Cálculos asíncronos mediante procesamiento por lotes.
- Cache de índices y configuraciones.
- Consultas optimizadas con Prisma.

### 10.3. Límites de Vercel

| Recurso | Límite (Hobby) | Límite (Pro) |
|---|---|---|
| Tiempo de función | 10 segundos | 60 segundos |
| Tamaño de función | 50 MB | 250 MB |
| Ancho de banda | 100 GB/mes | Ilimitado (según plan) |

**Mitigación:**

- Para cálculos que excedan 60 segundos, dividir en lotes o usar servicios externos.

***

## 11. Decisiones arquitectónicas clave

| Decisión | Alternativa descartada | Motivo | Referencia ADR |
|---|---|---|---|
| Next.js 16 App Router | Laravel + Livewire | Alineación con stack moderno, Server Components, mejor integración con Vercel. | `DECISIONS.md` (ADR-001) |
| Prisma ORM | Drizzle, Kysely | Madurez, ecosistema, generación de tipos TypeScript, migraciones integradas. | `DECISIONS.md` (ADR-002) |
| Neon.tech | Vercel Postgres, Supabase | Connection pooling nativo, escalado automático, compatibilidad total con Prisma. | `DECISIONS.md` (ADR-003) |
| Sesiones httpOnly | JWT en localStorage | Mayor seguridad, sin exposición a XSS, gestión centralizada en servidor. | `DECISIONS.md` (ADR-004) |
| Sin middleware.ts | Middleware de Next.js | Control de acceso como capa de proxy más flexible y mantenible. | `DECISIONS.md` (ADR-005) |
| Server Actions | API REST pura | Menor latencia, integración nativa con formularios, menos código boilerplate. | `DECISIONS.md` (ADR-006) |
| Tipos físicos UUID + Decimal(20,6)/(20,8) | `Float` e IDs autoincrementales | Precisión fiscal en hiperinflación e IDs no enumerables. | `DECISIONS.md` (ADR-007) |
| Motor de cálculo puro en TypeScript | Servicio Python separado | Mismo stack, testeabilidad y reproducibilidad versionada. | `DECISIONS.md` (ADR-008) |
| Índices y cálculos aprobados inmutables | Edición directa del dato | Trazabilidad y validez ante auditoría y SENIAT. | `DECISIONS.md` (ADR-009) |
| Alcance v1 cerrado + MVP incremental | Motor completo de una vez | Validación temprana con el contador, sin parálisis por análisis. | `DECISIONS.md` (ADR-010) |
| *(pendiente)* Reconciliación MVP ↔ modelo fiscal | Reescribir el MVP desde cero / ignorar la divergencia | Preservar datos ya recolectados sin bloquear Fase 1 indefinidamente. | `DECISIONS.md` (ADR-011, **por redactar** — bloquea B-01 en `TODO.md`) |

***

## 12. Riesgos técnicos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Errores en cálculos fiscales | Alto | Pruebas unitarias exhaustivas, casos de prueba validados, revisión por contador. |
| Pérdida de datos | Alto | Respaldo automático de Neon, transacciones Prisma, auditoría completa. |
| Timeout de funciones | Medio | Procesamiento por lotes, división de cálculos masivos, monitoreo de logs. |
| Cambios normativos | Medio | Reglas configurables, versionamiento, documentación clara. |
| Integración compleja en v2 | Medio | Diseño de API desde v1, documentación, contratos estables. |
| Migración MVP → modelo fiscal sin ADR-011 | Medio | No iniciar Fase 1 sin el plan de reconciliación (bloqueo B-01 activo en `TODO.md`). |
| Resistencia al cambio | Bajo | Capacitación, interfaz intuitiva, soporte continuo. |

***

## 13. Control de acceso (dos capas: proxy optimista + verificación real)

**Principio:** No usar `middleware.ts` de Next.js. El control de acceso real **nunca** vive solo en el proxy — siempre se verifica de nuevo en el servidor.

**Capa 1 — proxy optimista (`src/proxy.ts`):** solo comprueba que exista la cookie de sesión y redirige a `/login` si falta. No valida firma, expiración ni rol. Su único propósito es evitar un parpadeo de UI protegida antes de la verificación real.

**Capa 2 — verificación real (`src/lib/auth/session.ts`):**

```typescript
// src/lib/auth/session.ts
export async function getSessionUser() {
  // 1. Lee la cookie SESSION_COOKIE_NAME
  // 2. Busca la sesión por hash del token (tokenHash), nunca por el token en claro
  // 3. Verifica expiración (SESSION_TTL_DAYS) y user.active
  // 4. Si la sesión expiró o el usuario está inactivo: la elimina y limpia la cookie
  //    (evita el bucle /dashboard↔/login documentado en SECURITY.md)
  // 5. Actualiza lastSeenAt de forma oportunista
  // Devuelve el usuario autenticado o null
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function requireRole(allowedRoles: Array<'ADMIN' | 'RESPONDENT'>) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }
  return user;
}
```

> Los valores de rol son `'ADMIN' | 'RESPONDENT'` hoy (Fase M). Cuando se implemente el modelo de 5 roles (§4.2, objetivo Fase 1+), este tipo se amplía — no antes, y no sin el ADR-011 de reconciliación.

**Uso en Server Components:**

```typescript
// app/admin/users/page.tsx
export default async function AdminUsersPage() {
  await requireRole(['ADMIN']);
  // ...
}
```

**Uso en Server Actions:**

```typescript
// src/actions/auth.ts
'use server';

export async function deactivateUserAction(userId: string) {
  const session = await requireRole(['ADMIN']);
  // ...
}
```

**Uso en Route Handlers:**

```typescript
// app/api/uploads/route.ts
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return new Response(null, { status: 401 });
  // ...
}
```

***

## 14. Relación con otros documentos

| Documento | Relación con ARCHITECTURE.md |
|---|---|
| `PROJECT.md` | Define el problema y alcance que esta arquitectura resuelve. |
| `DOMAIN.md` | Proporciona las reglas de negocio que la arquitectura debe soportar. |
| `DATABASE.md` | Detalla el esquema de datos que implementa esta arquitectura (con el aviso de alcance MVP vs. objetivo replicado en ambos documentos). |
| `API.md` | Documenta los contratos de API definidos en esta arquitectura. |
| `SECURITY.md` | Especifica controles de seguridad que la arquitectura debe implementar; es la fuente de verdad para variables de entorno (§9.2) y el diseño real de sesión (§13). |
| `CONVENTIONS.md` | Establece cómo se escribe el código que implementa esta arquitectura; §1 de ese documento es la fuente canónica de los árboles de carpetas citados en §4.1/§4.1 bis. |
| `DECISIONS.md` | Registra las decisiones arquitectónicas con alternativas descartadas. |
| `TODO.md` | Controla el estado de implementación de cada componente; B-01 es el bloqueo activo que más afecta a este documento (B-02, resuelto 2026-09-26). |

***