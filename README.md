# SAIRFI — Sistema de Ajuste por Inflación Fiscal — Levantamiento Inicial

Plataforma web profesional para el levantamiento funcional y documental del futuro **Sistema de Ajuste por inflación fiscal inicial y regulares**. Recopila de forma estructurada requerimientos tributarios/contables, fuentes de datos, reglas de cálculo, casos de prueba, reportes, controles operativos y documentación de soporte.

Stack canónico: **Next.js 16 · React 19 · TypeScript strict · Tailwind 4 · Prisma 7 · Neon PostgreSQL · Vercel Blob privado**

## Características principales

- **5 secciones** con estado independiente `DRAFT | SUBMITTED | REOPENED` y progreso real `20/40/60/80/100%`
- **Borradores persistentes** server-side, autosave sin sobrescribir secciones enviadas
- **Validación dual** Zod en cliente y servidor; toda mutación crítica validada server-side
- **Casos de cálculo repetibles** (≥3 obligatorios) con INPC `Decimal(20,4)`
- **Vercel Blob privado** · archivos hasta 20 MB · metadatos en PostgreSQL, nunca binario en DB
- **Autenticación** sesión opaca hasheada + cookie `__Host-session` `httpOnly + SameSite=Lax + Path=/ + secure` + `proxy.ts` optimista + autorización real en Server Actions
- **Roles** `ADMIN` (gestiona usuarios, reabre, auditoría, export) · `RESPONDENT` ( dueño de sus levantamientos)
- **Admin**: tabla levantamientos con filtros, vista detalle, reabrir, export JSON, auditoría completa
- **Diseño** corporativo sobrio, light-only, responsive mobile-first, accesible

## Modelo de datos

`User | Session | FormSubmission | SectionSubmission | CalculationCase | Attachment | AuditLog`

Ver `prisma/schema.prisma:1` — `answers: Json` por sección, `inpc: Decimal`, `unique(submissionId, sectionNumber)`, `version` para concurrencia.

## Estructura

```
src/
  app/
    page.tsx              # Landing (título/subtítulo del spec)
    login/                # Login con Server Action
    dashboard/            # Listado por rol
    submissions/[id]/     # Resumen + progreso
      section/[section]/  # Formularios 1-5
    admin/{users,submissions,audit}
    api/{uploads,files/[id],export/[id]}
  components/{ui,form,layout}
  lib/
    db/client.ts          # PrismaClient + @prisma/adapter-neon
    auth/{session,password,audit}
    validation/{section-1..5,calculation-case,attachment}
    domain/{submissions,sections,attachments}
    storage/blob.ts
  actions/{auth,submissions,sections,attachments}
prisma/
  schema.prisma
  migrations/
  seed.ts
proxy.ts                  # Next.js 16 Proxy (no middleware.ts)
prisma.config.ts
```

## Requisitos

- Node 22+
- PostgreSQL Neon (o local) · Vercel Blob Store privado · Vercel hosting

## Variables de entorno

```env
# .env.example
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@host/neondb?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
SESSION_COOKIE_NAME="__Host-session"
SESSION_TTL_DAYS="7"
INITIAL_ADMIN_EMAIL="admin@empresa.com"
INITIAL_ADMIN_PASSWORD="Cambiar123!"
```

> Tras el bootstrap eliminar `INITIAL_ADMIN_*` del entorno. Nunca hardcodear secretos.

## Desarrollo local

```bash
npm install
npx prisma migrate dev   # o npm run db:migrate
npm run db:seed          # crea ADMIN inicial si no existe
npm run dev              # http://localhost:3000
```

Credenciales por defecto (ver `.env`): `noemdb@gmail.com / noemdb@gmail.com`

## Flujo de uso

1. Login → Dashboard → **+ Nuevo levantamiento**
2. Secciones `1 → 2 → 3 → 4 → 5`:
   - **Guardar borrador** (persistencia server, puedes abandonar y volver)
   - **Enviar sección** (valida Zod server-side; sección 3 exige ≥3 casos; sección 5 exige 6 categorías obligatorias en estado REGISTERED)
3. Admin puede reabrir, revisar JSON, descargar archivos autorizados, consultar auditoría

## Validación

- `lib/validation/section-*.ts` — esquemas Zod por sección, con condicionales `Otro`, `Fuente externa`, `Formatos específicos`
- `calculation-case.ts` — INPC >0, máx 4 decimales
- Flujo: `Browser Zod → Server Action Zod → Domain → Prisma → Audit`

## Almacenamiento de archivos

- Lista blanca: `xls, xlsx, csv, pdf, docx` · máx 20 MB
- Upload: `POST /api/uploads` valida sesión + MIME + tamaño + ownership → `put` a Blob privado + `registerAttachment` + audit `FILE_UPLOADED`
- Descarga: `GET /api/files/[id]` autentica → autoriza → audita `FILE_DOWNLOADED` → stream Blob privado (modo dev sin token devuelve metadata)
- Nunca URLs públicas para documentos sensibles

## Autenticación y Proxy

- Token aleatorio 32B → `sha256` → `Session.tokenHash` en DB. Cookie `__Host-session` solo lleva token.
- `proxy.ts` (Next 16) redirige optimista si falta cookie; **no** es única capa de autorización — toda Server Action / Route Handler / Server Component verifica sesión y ownership.
- No existe `middleware.ts`.

## Auditoría

Eventos: `LOGIN, LOGOUT, SUBMISSION_CREATED, SECTION_DRAFT_SAVED, SECTION_SUBMITTED, SECTION_REOPENED, FILE_UPLOADED, FILE_DELETED, FILE_DOWNLOADED, USER_CREATED, USER_DEACTIVATED`

Consulta solo ADMIN en `/admin/audit`.

## Deploy Vercel

1. Conectar repo · Framework **Next.js**
2. Configurar env vars en Vercel (DATABASE_URL, DIRECT_URL, BLOB_READ_WRITE_TOKEN, APP_URL, SESSION_*, INITIAL_ADMIN_*)
3. `Build Command`: `npm run build` (ejecuta `prisma generate` vía postinstall)
4. Crear Blob Store privado en Vercel Dashboard y copiar token
5. Neon: usar connection string pooled para `DATABASE_URL` y directo para `DIRECT_URL` según docs

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Next dev |
| `npm run build` | Next build + typecheck |
| `npm run db:generate` | Prisma generate |
| `npm run db:migrate` | Migrate dev |
| `npm run db:deploy` | Migrate deploy (prod) |
| `npm run db:seed` | Seed ADMIN inicial |

## Criterios de aceptación

Cumple AC-01..AC-20 del spec: creación, borradores, persistencia, validaciones duales, Otro condicional, ≥3 casos, 20 MB, Blob privado, aislamiento de archivos, RBAC, reopen, auditoría, responsive, sin middleware, Vercel+Neon, Prisma adapter, sin secretos expuestos.

## Licencia

Privado — levantamiento inicial SAIRFI.
