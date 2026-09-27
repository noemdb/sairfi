# CONVENTIONS.md — SAIRFI

> Revisión 2026-09-26 (v2). Ver "Registro de mejoras" para el detalle de qué cambió respecto a la versión anterior y por qué.

## 0. Registro de mejoras de esta revisión

| # | Problema detectado en la versión anterior | Corrección aplicada |
|---|---|---|
| 1 | El árbol de carpetas era un único diseño "objetivo" (empresas, ejercicios fiscales, motor de cálculo) que no coincide con lo que ya existe en el repo — `SECURITY.md` y `TODO.md` (Fase M) documentan rutas reales (`/admin`, `/api/uploads`, `src/actions/`, `src/lib/domain/`) que no aparecían aquí. | Se separan dos árboles: **§1.1 Estructura actual (Fase M — MVP)**, reconstruida a partir de las rutas citadas en `SECURITY.md`, y **§1.2 Estructura objetivo (Fase 1+)**, el diseño fiscal completo. |
| 2 | El ejemplo de guarda (`requireRole(['admin'])`) usaba minúsculas, pero la convención de enums de este mismo documento (§2) exige `UPPER_SNAKE_CASE`, y el modelo de roles del MVP (`SECURITY.md`) usa `ADMIN`/`RESPONDENT`. | Ejemplos actualizados a `requireRole(['ADMIN'])` y se aclara que el MVP solo tiene 2 roles; los 5 roles fiscales (`ARCHITECTURE.md` §4.2) son objetivo de Fase 1+. |
| 3 | No había convención explícita para las carpetas ya en uso `src/actions/`, `src/lib/domain/`, `src/lib/storage/`, `src/lib/audit.ts` (nombradas en `SECURITY.md` pero ausentes de este documento). | Añadidas a §1.1 con su responsabilidad. |
| 4 | La nota de `docs/` estaba fuera del árbol (como comentario suelto), causando ambigüedad sobre si los 9 documentos viven en la raíz o en `docs/`. | Incorporada directamente al árbol en ambas secciones. |

***

## 1. Estructura de carpetas

### 1.1. Estructura actual (Fase M — MVP de recolección, en código)

Reconstruida a partir de las rutas y archivos citados en `SECURITY.md` y `TODO.md`. Esta es la carpeta real del repo hoy; **no** incluye todavía el modelo fiscal de `DATABASE.md` §3 (bloqueado por B-01, ver `TODO.md`).

```
sairfi/
├── docs/                          # PROJECT, ARCHITECTURE, DOMAIN, DATABASE, API, SECURITY, CONVENTIONS, DECISIONS, TODO
├── prisma/
│   ├── schema.prisma               # modelo MVP: users(role: ADMIN|RESPONDENT), sessions, form_submissions, sections, attachments, audit_logs
│   ├── migrations/
│   └── seed.ts                     # crea ADMIN inicial desde INITIAL_ADMIN_EMAIL/PASSWORD
├── public/
├── src/
│   ├── app/
│   │   ├── login/ | register/ (o grupo (public)/)
│   │   ├── dashboard/
│   │   ├── submissions/
│   │   │   └── [id]/
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   ├── submissions/
│   │   │   └── audit/
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/           # H-M1: carpeta vacía, resolver (TODO backlog)
│   │       │   └── logout/          # H-M1: carpeta vacía, resolver (TODO backlog)
│   │       ├── uploads/
│   │       │   └── route.ts         # POST, valida MIME/tamaño/allowlist, sube a Blob privado
│   │       ├── export/
│   │       │   └── [id]/route.ts    # export auditado, respeta propiedad
│   │       └── files/
│   │           └── [id]/route.ts    # descarga verificada por propiedad
│   ├── actions/
│   │   ├── auth.ts                  # loginAction, createUserAction, deactivateUserAction
│   │   ├── submissions.ts
│   │   ├── sections.ts
│   │   └── attachments.ts
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── session.ts           # getSessionUser(), tokenHash, expiración, limpieza de cookies huérfanas
│   │   │   └── password.ts          # bcryptjs cost 12
│   │   ├── domain/
│   │   │   ├── submissions.ts       # reglas de propiedad y estado (borrador→envío)
│   │   │   └── attachments.ts       # reglas de propiedad de adjuntos
│   │   ├── storage/
│   │   │   └── blob.ts              # Vercel Blob privado; fallback local solo en dev sin token
│   │   ├── validation/
│   │   │   ├── auth.ts              # loginSchema, createUserSchema
│   │   │   ├── attachment.ts
│   │   │   └── section-1.ts … section-5.ts
│   │   ├── audit.ts                 # persiste audit_logs con metadata curada, nunca tokens/hashes
│   │   └── db/
│   │       └── client.ts            # singleton Prisma (Neon)
│   └── proxy.ts                     # capa de acceso optimista: presencia de cookie → redirect; NO valida firma (ver SECURITY.md)
├── .env.example
├── next.config.ts
└── package.json
```

> **Nota:** faltan `vitest`, `msw` y `playwright` en `package.json` (deuda de §7, prerrequisito del Paso 04). No agregar tests reales hasta instalarlos y documentarlo en `TODO.md`.

### 1.2. Estructura objetivo (Fase 1+ — motor fiscal, `DATABASE.md` §3)

Este es el diseño al que migra el proyecto una vez resuelto B-01 (`TODO.md`). No confundir con §1.1: hasta que ADR-011 defina la reconciliación, **no crear estas carpetas todavía**.

```
sairfi/
├── docs/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (protected)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── companies/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── fiscal-periods/
│   │   │   ├── price-indices/
│   │   │   ├── fiscal-items/
│   │   │   ├── calculations/
│   │   │   ├── reports/
│   │   │   ├── imports/
│   │   │   └── settings/
│   │   └── api/
│   │       └── v1/
│   │           ├── companies/
│   │           ├── fiscal-periods/
│   │           ├── price-indices/
│   │           ├── fiscal-items/
│   │           ├── calculations/
│   │           ├── reports/
│   │           └── imports/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── modal.tsx
│   │   │   └── index.ts
│   │   ├── forms/
│   │   │   ├── company-form.tsx
│   │   │   ├── fiscal-item-form.tsx
│   │   │   └── index.ts
│   │   ├── tables/
│   │   │   ├── fiscal-items-table.tsx
│   │   │   └── index.ts
│   │   └── charts/
│   │       └── adjustment-summary.tsx
│   ├── lib/
│   │   ├── auth/            # sesión, guardas require*, hashing, auditoría (reutiliza lo de §1.1)
│   │   ├── db/
│   │   │   └── client.ts
│   │   ├── validation/
│   │   │   ├── company.validator.ts
│   │   │   ├── fiscal-period.validator.ts
│   │   │   ├── fiscal-item.validator.ts
│   │   │   └── index.ts
│   │   └── utils.ts
│   ├── services/
│   │   ├── company.service.ts
│   │   ├── fiscal-period.service.ts
│   │   ├── fiscal-item.service.ts
│   │   ├── calculation/
│   │   │   ├── initial-adjustment.calculator.ts
│   │   │   ├── regular-adjustment.calculator.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── types/
│       ├── index.ts
│       ├── fiscal.ts
│       └── calculation.ts
├── src/proxy.ts              # capa de acceso optimista (sin middleware.ts, ver ADR-005); se conserva de §1.1
├── .env.example
├── .env.local
├── .gitignore
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── prisma.config.ts
```

> **Nota:** `src/generated/` (cliente Prisma) está ignorado en git en ambas estructuras.

***

## 2. Convenciones de nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| **Componentes React** | PascalCase, nombre descriptivo | `FiscalItemForm`, `AdjustmentSummary` |
| **Archivos de componentes** | kebab-case, mismo nombre que el componente | `fiscal-item-form.tsx`, `adjustment-summary.tsx` |
| **Archivos de utilidades** | kebab-case, descriptivo | `db.ts`, `auth.ts`, `utils.ts` |
| **Variables y funciones** | camelCase, descriptivo | `calculateAdjustment`, `fiscalPeriodId` |
| **Constantes** | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE` |
| **Tipos TypeScript** | PascalCase, sufijo `Type` opcional | `FiscalItem`, `AdjustmentResult` |
| **Interfaces** | PascalCase, prefijo `I` opcional (evitar si es posible) | `FiscalItem`, `AdjustmentCalculation` |
| **Enums (valores)** | PascalCase el tipo, valores en `UPPER_SNAKE_CASE` | `FiscalItemType.ACTIVO`, `AdjustmentStatus.APROBADO`, roles `ADMIN` / `RESPONDENT` |
| **Tablas DB** | snake_case, plural | `companies`, `fiscal_periods`, `fiscal_items` |
| **Columnas DB** | snake_case, descriptivo | `fecha_adquisicion`, `valor_historico` |
| **Rutas de API** | kebab-case, plural para recursos | `/api/v1/fiscal-items`, `/api/uploads`, `/api/export/[id]` |
| **Server Actions** | camelCase, sufijo `Action` | `createCompanyAction`, `loginAction`, `calculateAdjustmentAction` |
| **Hooks personalizados** | camelCase, prefijo `use` | `useFiscalItems`, `useAdjustmentCalculation` |
| **Guardas de acceso** | camelCase, prefijo `require`; reciben **valores de enum en `UPPER_SNAKE_CASE`** | `requireAuth()`, `requireRole(['ADMIN'])`, `requireRole(['ADMIN', 'ANALISTA'])` (Fase 1+) |

> El MVP (Fase M) solo conoce los roles `ADMIN` y `RESPONDENT` (`SECURITY.md`). Los roles `ANALISTA`, `CONTADOR`, `ASESOR`, `AUDITOR` son parte del modelo objetivo de 5 roles (`ARCHITECTURE.md` §4.2) y no existen todavía en `prisma/schema.prisma`.

***

## 3. Estilo de código

### 3.1. Formateador / linter

| Herramienta | Configuración |
|---|---|
| **Prettier** | Configuración por defecto de Next.js, comillas simples, trailing commas ES5 |
| **ESLint** | `next/core-web-vitals`, `plugin:@typescript-eslint/recommended`, `prettier` |
| **TypeScript** | `strict: true`, `noImplicitAny: true`, `strictNullChecks: true` |

### 3.2. Reglas propias que no cubre el linter por defecto

- **Server Components por defecto:** Todo componente es Server Component a menos que requiera interactividad real. Usar `'use client'` solo cuando sea necesario.
- **Validación con Zod:** Todos los datos de entrada (formularios, API) deben validarse con schemas de Zod. Prohibido usar datos sin validar.
- **Tipado explícito:** Prohibido `any` implícito o explícito. Usar tipos inferidos de Zod (`z.infer<typeof Schema>`).
- **Manejo de errores:** Usar `try-catch` con mensajes de error amigables. Nunca exponer errores técnicos al usuario final (deuda abierta: `D-M2` en `TODO.md` — hoy algún `500` expone mensaje crudo en `POST /api/uploads`).
- **Funciones puras:** Los servicios de cálculo deben ser funciones puras sin efectos secundarios. Las guardas de sesión (`getSessionUser`) y de auditoría (`audit.ts`) son la excepción explícita: tienen efectos por diseño (leer cookies, escribir `audit_logs`).
- **Nomenclatura de estados:** Usar sufijos claros: `isLoading`, `isError`, `isSuccess`, `data`.
- **Imports ordenados:** Primero librerías externas, luego componentes propios, luego tipos y utilidades.
- **Comentarios:** Solo para explicar "por qué", no "qué". El código debe ser autoexplicativo.
- **Longitud de funciones:** Máximo 50 líneas por función. Si excede, extraer lógica a funciones auxiliares.
- **Exports:** Preferir `export default` para componentes principales, `export named` para utilidades.
- **Doble capa de control de acceso (§13 de `ARCHITECTURE.md`):** toda Server Action y Route Handler llama primero a `getSessionUser()`; `src/proxy.ts` es solo optimista y nunca sustituye esta verificación.

***

## 4. Patrones preferidos

### 4.1. Server Actions tipadas

```typescript
// ✅ Preferido
'use server';

import { z } from 'zod';
import { CreateFiscalItemSchema } from '@/lib/validation';

export async function createFiscalItemAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const validated = CreateFiscalItemSchema.parse(Object.fromEntries(formData));
  // ...
}
```

### 4.2. Composición sobre herencia

```typescript
// ✅ Preferido
function FiscalItemForm() {
  return (
    <Form>
      <FiscalItemFields />
      <FormActions />
    </Form>
  );
}
```

### 4.3. Hooks personalizados para lógica repetida

```typescript
// ✅ Preferido
function useFiscalItems(fiscalPeriodId: string) {
  const [items, setItems] = useState<FiscalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Lógica de carga, filtrado, etc.

  return { items, isLoading, refetch: loadItems };
}
```

### 4.4. Servicios de dominio sin estado

```typescript
// ✅ Preferido
export class InitialAdjustmentCalculator {
  calculate(items: FiscalItem[], indices: PriceIndex[]): AdjustmentResult {
    // Lógica pura, sin acceso directo a DB
  }
}
```

> Nota: usar clase aquí es solo agrupación; la clase no guarda estado entre llamadas ni tiene efectos secundarios (ver §3.2). Si no se necesita agrupar varios métodos relacionados, preferir una función exportada simple sobre una clase de un solo método.

### 4.5. Validación en el límite del sistema

```typescript
// ✅ Preferido
export async function createCompanyAction(formData: FormData) {
  const validated = CreateCompanySchema.parse(Object.fromEntries(formData));
  await CompanyService.create(validated);
}
```

### 4.6. Revalidación de rutas

```typescript
// ✅ Preferido
import { revalidatePath } from 'next/cache';

export async function createCompanyAction(formData: FormData) {
  await CompanyService.create(data);
  revalidatePath('/companies');
}
```

### 4.7. Guarda de rol en Server Action (patrón vigente desde Fase M)

```typescript
// ✅ Preferido — ver ARCHITECTURE.md §13
'use server';

export async function deactivateUserAction(userId: string) {
  const session = await requireRole(['ADMIN']);
  if (session.userId === userId) {
    return { success: false, error: 'No puedes desactivar tu propia cuenta' };
  }
  // ...
}
```

***

## 5. Patrones a evitar

### 5.1. Lógica de negocio en componentes de UI

```typescript
// ❌ Evitar
function FiscalItemForm() {
  const calculateAdjustment = (item: FiscalItem) => {
    // Lógica compleja de cálculo aquí
  };

  return <form>...</form>;
}
```

### 5.2. Queries directas en el frontend

```typescript
// ❌ Evitar
async function loadItems() {
  const items = await prisma.fiscalItem.findMany();
  // ...
}
```

### 5.3. Fetch manual cuando existe Server Action

```typescript
// ❌ Evitar
async function handleSubmit() {
  await fetch('/api/fiscal-items', { method: 'POST', body: data });
}

// ✅ Preferido
await createFiscalItemAction(formData);
```

### 5.4. Server Actions no-async en módulos `"use server"`

```typescript
// ❌ Evitar: Next elimina el export y el build falla
// ("export X was not found in module")
export function openFiscalPeriodAction(id: string) {
  return transitionAction(id, /* ... */);
}

// ✅ Preferido: toda acción exportada es `async function`
export async function openFiscalPeriodAction(id: string) {
  return transitionAction(id, /* ... */);
}
```
*Origen: `npm run dev` fallaba con slugs distintos (`[id]` vs `[companyId]` en `companies/`) y el build reveló además este export no-async. 2026-09-26.*

### 5.5. Componentes cliente innecesarios
```typescript
// ❌ Evitar
'use client';

export default function CompaniesPage() {
  // Sin interactividad real
  return <div>...</div>;
}

// ✅ Preferido (Server Component)
export default async function CompaniesPage() {
  return <div>...</div>;
}
```

### 5.5. Servicios Python separados

```typescript
// ❌ Evitar (a menos que sea estrictamente necesario)
// Servicio Python externo para cálculos

// ✅ Preferido
// Lógica de cálculo en TypeScript dentro del mismo proyecto
```

### 5.6. Variables genéricas

```typescript
// ❌ Evitar
const data = await fetchSomething();
const x = 10;

// ✅ Preferido
const fiscalItems = await loadFiscalItems();
const adjustmentFactor = 1.25;
```

### 5.7. Confiar en `src/proxy.ts` como única verificación de acceso

```typescript
// ❌ Evitar — el proxy solo revisa presencia de cookie, no firma ni expiración
export async function GET() {
  // sin getSessionUser() aquí: cualquier cookie con el nombre correcto pasaría
  return Response.json(await prisma.company.findMany());
}

// ✅ Preferido
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response(null, { status: 401 });
  // ...
}
```

***

## 6. Convenciones de commits / control de versiones

### 6.1. Formato de mensajes

**Conventional Commits:**

```
<tipo>(<alcance>): <descripción breve>

[cuerpo opcional]

[pie opcional]
```

**Tipos:**

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (sin impacto en lógica)
- `refactor`: Refactorización (sin cambio de comportamiento)
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento, dependencias, configuración

**Ejemplos:**

```
feat(companies): agregar CRUD de empresas

fix(uploads): no exponer mensaje técnico crudo en error 500 (D-M2)

docs(DATABASE): actualizar esquema de fiscal_items

refactor(services): extraer lógica de validación a función auxiliar

chore(deps): instalar Vitest + MSW + Playwright (deuda de §7)
```

### 6.2. Estrategia de ramas

- **Rama principal:** `main` (protegida, requiere PR y revisión)
- **Ramas de feature:** `feature/nombre-descriptivo`
- **Ramas de fix:** `fix/nombre-descriptivo`
- **Ramas de docs:** `docs/nombre-descriptivo`

**Flujo:**

1. Crear rama desde `main`.
2. Desarrollar feature o fix.
3. Crear Pull Request a `main`.
4. Revisión de código (al menos 1 aprobador).
5. Merge a `main` (squash merge preferido).
6. Deploy automático a production vía Vercel.

***

## 7. Convenciones de testing

### 7.1. Framework

| Tipo de test | Framework |
|---|---|
| **Unitarios** | Vitest + React Testing Library |
| **Integración** | Vitest + MSW (Mock Service Worker) |
| **E2E** | Playwright |

> **Estado (2026-09-26):** ninguno de estos frameworks está instalado en `package.json` todavía — es la primera tarea pendiente de `TODO.md` Fase 0 y bloquea el checklist del Paso 04 para cualquier bloque de Fase M (auth, submissions, uploads, admin siguen en 🧪 por esto).

### 7.2. Qué se testea obligatoriamente

- **Lógica de negocio:** Motores de cálculo (inicial y regular) — Fase 1+.
- **Auth y sesiones:** expiración, limpieza de cookies huérfanas, bucle `/dashboard`↔`/login` (Fase M, primer bloque a testear según `TODO.md`).
- **Validaciones:** Schemas de Zod (casos válidos e inválidos).
- **Endpoints críticos:** `POST /api/uploads`, `GET /api/export/[id]`, `GET /api/files/[id]`.
- **Server Actions:** Acciones que modifican datos (`submissions.ts`, `sections.ts`, `auth.ts`).
- **Componentes complejos:** Formularios con validación, tablas con filtrado.
- **Servicios de dominio:** Servicios que contienen lógica de negocio.

### 7.3. Qué no se testea (y por qué)

- **Componentes de UI simples:** Botones, inputs básicos (ya probados por librerías).
- **Layouts:** Estructura general de páginas (se valida visualmente).
- **Configuración:** Archivos de configuración (se validan en CI).
- **Generación de PDF/Excel:** Se valida manualmente o con snapshots (complejidad alta).

### 7.4. Cobertura mínima

- **Líneas:** 70%
- **Funciones:** 80%
- **Ramas:** 60%

***

## 8. Hallazgos de auditorías (histórico)

| Fecha | Hallazgo | Convención resultante |
|---|---|---|
| 2026-09-26 | Lógica de cálculo mezclada con componentes de UI | Separar motores de cálculo en servicios de dominio puros |
| 2026-09-26 | Variables genéricas (`data`, `x`, `temp`) | Usar nombres descriptivos que indiquen propósito |
| 2026-09-26 | Componentes cliente sin interactividad real | Server Components por defecto, `'use client'` solo cuando sea necesario |
| 2026-09-26 | Validaciones dispersas en el código | Centralizar validaciones con Zod en el límite del sistema |
| 2026-09-26 | Funciones de más de 100 líneas | Máximo 50 líneas por función, extraer lógica auxiliar |
| 2026-09-26 | Imports desordenados | Ordenar imports: librerías externas, componentes propios, tipos y utilidades |
| 2026-09-26 | Errores técnicos expuestos al usuario | Usar mensajes de error amigables, registrar detalles técnicos en logs (deuda abierta en `POST /api/uploads`, ver D-M2) |
| 2026-09-26 | Tipos `any` implícitos | `strict: true` en TypeScript, prohibido `any` explícito o implícito |
| 2026-09-26 | Árbol de carpetas del documento no reflejaba el código real de Fase M | Se documentan dos árboles (actual vs. objetivo, ver §1) en vez de uno solo aspiracional |

***

## 9. Relaciones con otros documentos

| Documento | Relación con CONVENTIONS.md |
|---|---|
| `PROJECT.md` | Define el contexto del proyecto que estas convenciones buscan mantener consistente. |
| `ARCHITECTURE.md` | Las convenciones deben alinearse con la arquitectura definida; §1.1 de este documento se deriva de `ARCHITECTURE.md` §13. |
| `DOMAIN.md` | Las reglas de negocio deben reflejarse en las convenciones de código. |
| `DATABASE.md` | Las convenciones de nombres de tablas y columnas se alinean con este documento; §1.2 refleja `DATABASE.md` §3. |
| `API.md` | Las convenciones de rutas y contratos de API se coordinan con este documento. |
| `SECURITY.md` | Las prácticas de seguridad deben reflejarse en las convenciones de código; §1.1 se reconstruyó a partir de las rutas y roles que ahí se citan. |
| `DECISIONS.md` | Las decisiones sobre convenciones controvertidas se registran como ADRs. |
| `TODO.md` | El estado de implementación de convenciones se controla aquí. |

***