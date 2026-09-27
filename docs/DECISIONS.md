# DECISIONS.md — SAIRFI

> Registro de Architecture Decision Records (ADR). Se actualiza continuamente: cada vez que se elige entre alternativas reales (Paso 02) o que una auditoría (Paso 06) sugiere un cambio de rumbo, se agrega una entrada nueva. Nunca se edita ni se borra una decisión pasada — si cambia, se agrega una nueva entrada que la reemplaza y se referencia la anterior.

## Formato de cada entrada

```
## ADR-{{número}} — {{Título corto de la decisión}}
**Fecha:** {{YYYY-MM-DD}}
**Estado:** Propuesta | Aceptada | Reemplazada por ADR-XXX | Rechazada

### Contexto
{{Qué problema o disyuntiva motivó esta decisión.}}

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| | | |

### Decisión
{{Qué se decidió, en una o dos frases claras.}}

### Consecuencias
{{Qué se gana, qué se sacrifica, qué queda pendiente de revisar a futuro.}}
```

---

## ADR-001 — Stack Next.js 16 App Router en Vercel en lugar de Laravel en VPS
**Fecha:** 2026-09-23
**Estado:** Aceptada

### Contexto
`PROJECT.md` (§ Contexto institucional) contemplaba como restricción inicial "VPS Linux con PHP 8+, Laravel, PostgreSQL". Al definir la arquitectura (Paso 02, `ARCHITECTURE.md` §1 y §11) hubo que elegir el stack real del v1. El `package.json` vigente confirma lo implementado: `next 16.3.6`, `react 19.2.8`, `prisma 7.10.0`, deploy en Vercel.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Next.js 16 App Router + React 19 + TypeScript en Vercel | Server Components, Server Actions nativas, preview deploys por PR, HTTPS/cache/CDN incluidos, alineado con equipo TS | Límite de timeout en funciones (10 s Hobby / 60 s Pro), sin control total del servidor |
| Laravel + Livewire en VPS Linux | Coincidía con la restricción original de `PROJECT.md`, control total del servidor, jobs largos sin timeout serverless | Doble stack (PHP + JS), sin Server Components, CI/CD y HTTPS a montar a mano, más carga operativa |

### Decisión
Se adopta Next.js 16.x (App Router únicamente) + React 19.x + TypeScript `strict` + Tailwind 4.x, con despliegue en Vercel y CI/CD por push a `main`, descartando Laravel/VPS para el v1.

### Consecuencias
Se gana velocidad de desarrollo, tipado de extremo a extremo con Zod y despliegue trivial; se sacrifica ejecución de trabajos largos dentro del request (los motores de cálculo masivos deben ir por lotes o fuera del cron — ver ADR-006). Queda pendiente actualizar `PROJECT.md` § Contexto institucional, que aún menciona PHP/Laravel y contradice esta decisión.

---

## ADR-002 — Monolito modular en lugar de microservicios
**Fecha:** 2026-09-23
**Estado:** Aceptada

### Contexto
SAIRFI v1 tiene volumen transaccional moderado, necesita trazabilidad transaccional completa (cálculo + índices + aprobación en una sola transacción ACID) y recursos de infraestructura limitados (`ARCHITECTURE.md` §2.1, §10).

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Monolito modular Next.js (`src/app`, `src/services`, `src/lib`) | Una sola transacción Prisma, despliegue único en Vercel, trazabilidad simple vía `audit_logs` | Acoplamiento si no se respetan límites entre módulos |
| Microservicios (cálculo / importación / reportes separados) | Escalado independiente del motor de cálculo | Complejidad operativa, consistencia eventual, trazabilidad distribuida; injustificable para v1 |

### Decisión
Monolito modular: módulos funcionales en `src/app/(public)` y `src/app/(protected)` (`companies`, `fiscal-periods`, `fiscal-items`, `calculations`, `reports`, `imports`), con dominio aislado en `src/services/calculation`.

### Consecuencias
Se gana simplicidad operativa y atomicidad; se sacrifica escalado independiente. La extensibilidad a v2 (compras, ventas, IVA, retenciones) se logra con nuevos módulos y Route Handlers, sin reescribir el núcleo. Revisar si el volumen de cálculos supera los timeouts de Vercel.

---

## ADR-003 — Prisma ORM 7 + PostgreSQL en Neon.tech
**Fecha:** 2026-09-23
**Estado:** Aceptada

### Contexto
Se necesitaba un ORM con migraciones integradas, tipos TypeScript generados y pooling compatible con serverless (`ARCHITECTURE.md` §3, §4.4; `DATABASE.md` §1, §5; `package.json`: `@prisma/client 7.10.0`, `@prisma/adapter-neon`, `@neondatabase/serverless`).

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Prisma ORM 7.x + PostgreSQL 18 en Neon.tech | `schema.prisma` como fuente de verdad, `z.infer` + Zod, `migrate deploy` en CI, pooling nativo (`DATABASE_URL` pooled / `DIRECT_URL` direct), respaldo automático | Requiere adaptador (`pgbouncer=true`, `previewFeatures = ["driverAdapters"]`) y atención a compatibilidad con PG 18 |
| Drizzle / Kysely + Vercel Postgres o Supabase | Más ligero / más control SQL | Ecosistema y migraciones menos maduros (Drizzle/Kysely) o pooling menos directo para Prisma (alternativas de hosting) |

### Decisión
Prisma ORM 7.x como único acceso a datos (singleton en `src/lib/db`) sobre PostgreSQL 18 en Neon.tech, con doble URL (pooled para runtime, direct para migraciones).

### Consecuencias
Se gana productividad y seguridad de tipos; se asume dependencia de Neon y de la compatibilidad Prisma↔PG 18. Todo cambio de esquema sigue el proceso `migrate dev → review SQL → migrate deploy` y, si es relevante, genera ADR nuevo.

---

## ADR-004 — Sesiones con cookie `httpOnly` + tabla `sessions`, sin JWT en storage
**Fecha:** 2026-09-23
**Estado:** Aceptada

### Contexto
La información tributaria es sensible (`PROJECT.md`, `DATABASE.md` §6, `ARCHITECTURE.md` §2.4). Había que elegir cómo mantener la sesión sin exponer credenciales a XSS (`ARCHITECTURE.md` §4.2, §13; `prisma/schema.prisma`: modelos `User`, `Session` con `tokenHash`, `expiresAt`).

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Sesión servidora: cookie `httpOnly` (`__Host-session`), `secure`, `sameSite`, hash en tabla `sessions` con expiración y revocación | Token nunca accesible desde JS, revocación y expiración centralizadas, auditoría de `LOGIN`/`LOGOUT` | Requiere lookup en DB por request y limpieza de sesiones expiradas |
| JWT en `localStorage`/`sessionStorage` | Stateless, sin lookup | Expuesto a robo por XSS, revocación difícil, contradice `SECURITY.md` |

### Decisión
Sesiones basadas en cookie `httpOnly` validada en servidor (`getSessionUser`), con `bcryptjs` para contraseñas; prohibido JWT en almacenamiento web.

### Consecuencias
Se gana seguridad y control de sesiones activas; se sacrifica statelessness. Queda pendiente documentar expiración/rotación y recuperación de contraseña en `SECURITY.md`, hoy aún plantilla.

---

## ADR-005 — Control de acceso como capa `proxy` + guardas explícitas, sin `middleware.ts`
**Fecha:** 2026-09-24
**Estado:** Aceptada

### Contexto
Next.js 16 renombra `middleware.ts` a `proxy.ts` y `ARCHITECTURE.md` (§3, §11, §13) exige no usar middleware clásico sino una capa explícita más mantenible. El código vigente lo implementa en `src/proxy.ts` (redirect optimista a `/login` si no hay cookie, sin redirigir `/login`→`/dashboard` para evitar bucles) más guardas en Server Components/Actions/Route Handlers.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Capa `proxy` (`src/proxy.ts`, control optimista) + `requireAuth`/`requireRole` en cada entrada | Explícito, testeable, evita bucles de redirect, matriz RBAC visible en código | Requiere disciplina: cada ruta/acción debe llamar a la guarda |
| `middleware.ts` clásico centralizado | Un solo punto de control | Menos flexible, acoplado al ciclo de vida del middleware, riesgo de redirects opacos (bucle ya observado y documentado en `src/proxy.ts`) |

### Decisión
Sin `middleware.ts`: control optimista en `src/proxy.ts` más autorización real con guardas (`requireRole(['admin', …])`) en Server Components, Server Actions y Route Handlers, con la matriz RBAC canónica en `SECURITY.md`.

### Consecuencias
Se gana claridad y se elimina el bucle `/dashboard`↔`/login`; se sacrifica el "olvido cero" (una ruta sin guarda queda expuesta salvo por el proxy optimista). Queda pendiente completar la matriz RBAC en `SECURITY.md` (hoy vacía) y auditar que toda ruta protegida tenga guarda real, no solo chequeo de cookie.

---

## ADR-006 — Híbrido Server Actions + Route Handlers en lugar de API REST pura
**Fecha:** 2026-09-24
**Estado:** Aceptada

### Contexto
SAIRFI mezcla formularios autenticados (empresas, partidas, cálculos, aprobaciones) con necesidades de integración/exportación (importar XLSX/CSV, descargar reportes, futura API v2 para sistemas contables). `ARCHITECTURE.md` §4.3 define el criterio de uso; el repo ya tiene ambos: `src/actions/` y `src/app/api/` (incl. `src/app/api/export/[id]/route.ts`).

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Híbrido: Server Actions para mutaciones de formularios + Route Handlers `/api/v1` para integraciones/exportaciones | Menos boilerplate y latencia en formularios (`useActionState`), validación Zod en el límite, `revalidatePath` nativa; API estable para v2 | Dos estilos a mantener, requiere criterio de uso disciplinado |
| API REST pura con `fetch` manual | Uniformidad, reutilizable desde cualquier cliente | Más boilerplate, doble validación, peor integración con formularios Next.js (`CONVENTIONS.md` §5.3 lo prohíbe expresamente) |

### Decisión
Server Actions para mutaciones (crear empresa, cargar índices, importar, calcular, aprobar) y Route Handlers para integraciones externas, descargas XLSX/PDF/CSV y futuros webhooks (`fiscal_period.closed`, `adjustment_calculation.approved`, …).

### Consecuencias
Se gana ergonomía y menos código; los cálculos que excedan el timeout de Vercel deben dividirse en lotes o externalizarse (nunca el motor completo en un cron). Cada endpoint/acción nueva se documenta en `API.md` en el mismo momento (hoy `API.md` sigue en plantilla: deuda pendiente del Paso 03).

---

## ADR-007 — Modelo de datos: `snake_case` plural, UUID, `Decimal` fiscal y `audit_logs` inmutables
**Fecha:** 2026-09-24
**Estado:** Aceptada

### Contexto
El dominio exige precisión monetaria, trazabilidad y retención tributaria de 10 años (`DOMAIN.md` §3–§4, `DATABASE.md` §1, §3, §6). Había que fijar convenciones físicas y tipos antes de la primera migración (Paso 02 → refinado en Paso 03).

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Elegida: tablas `snake_case` plural, columnas `snake_case`, PK `String` UUID (`uuid()`/`cuid()`), `Decimal(18,2)` dinero / `Decimal(10,5)` índices / `Decimal(10,8)` factores, `createdAt`/`updatedAt`, `audit_logs` append-only con `oldValues`/`newValues` | Precisión fiscal, IDs no enumerables, auditoría reproducible, retención legal cumplible | UUIDs menos compactos que enteros, `Decimal` exige manejo cuidadoso en JS |
| Enteros autoincrementales + `Float` + tablas singulares/camelCase | Más compacto, familiar | `Float` introduce errores de redondeo fiscal, IDs enumerables, convenciones inconsistentes con Prisma/Postgres |

### Decisión
Se adoptan las convenciones de `DATABASE.md` §1 y los tipos de precisión definidos allí, con auditoría inmutable y borrado lógico por `estado` (borrado físico solo para temporales).

### Consecuencias
Se gana corrección fiscal y auditabilidad; se paga con disciplina en migraciones y en el manejo de `Decimal`. Divergencia conocida: el `schema.prisma` vigente implementa el MVP de recolección (`form_submissions`, `calculation_cases`, `attachments`, `audit_logs` de formulario) y aún no el modelo fiscal completo de `DATABASE.md` §3 — ver ADR-010.

---

## ADR-008 — Motor de cálculo como funciones puras TypeScript versionadas, sin servicio Python
**Fecha:** 2026-09-24
**Estado:** Aceptada

### Contexto
El núcleo de SAIRFI son dos motores (ajuste inicial y reajuste regular: `Factor = cierre/base`, `Actualizado = base × factor`, `Ajuste = actualizado − base`, consolidación y efecto neto — `DOMAIN.md` R-101…R-108, `ARCHITECTURE.md` §4.5). La tentación era un microservicio Python numérico separado; `CONVENTIONS.md` §5.5 lo veta salvo necesidad estricta.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Funciones puras TS sin estado (`initial-adjustment.calculator.ts`, `regular-adjustment.calculator.ts`, …), sin acceso a DB, con `version_reglas`/`version_indices` registradas por cálculo | Testeable con Vitest, mismo repo/stack, reproducibilidad histórica, inyección de estrategias ante cambios normativos | TS no es stack numérico especializado; cálculos gigantes deben partirse en lotes |
| Servicio Python separado para cálculos | Ecosistema numérico maduro | Despliegue, versionado y trazabilidad duplicados, latencia y contrato inter-servicio extra |

### Decisión
Motores en TypeScript dentro de `src/services/calculation/`, puros y sin E/S, alimentados por DTOs validados con Zod; cada `adjustment_calculation` persiste índices, reglas y versiones aplicadas más resultados por partida en `calculation_results`.

### Consecuencias
Se gana simplicidad y testabilidad (cobertura mínima exigible: 70 % líneas / 80 % funciones); los índices usados en cálculos aprobados se vuelven inmutables (solo reemplazo por nueva versión + recálculo, `DOMAIN.md` R-303/R-304). Queda pendiente implementar los calculators (el MVP actual aún no los contiene).

---

## ADR-009 — Reglas versionadas e inmutables: índices y cálculos aprobados no se editan
**Fecha:** 2026-09-24
**Estado:** Aceptada

### Contexto
Sin versionamiento, corregir un INPC o una regla altera silenciosamente la historia fiscal (`PROJECT.md`: "sin versionamiento" como dolor actual; `DOMAIN.md` §6.3, R-303/R-304; `DATABASE.md`: `version`, `estado` en `price_indices` y `adjustment_calculations`).

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Inmutabilidad con versionado: `BORRADOR → APROBADO → REEMPLAZADO`, corrección = nueva versión + notificación + recálculo opcional | Historia reproducible, auditoría creíble ante SENIAT, estados de ejercicio/cálculo formales (`BORRADOR…CERRADO/REABIERTO`) | Más filas y lógica de estados/flujos |
| Edición directa del dato aprobado | Simple a corto plazo | Destruye trazabilidad, invalida cierres ya aprobados |

### Decisión
Nada aprobado se muta: índices, reglas y cálculos se reemplazan por nueva versión; los estados (`R-401`/`R-402`) y validaciones (no aprobar sin partidas clasificadas ni índices completos) se hacen cumplir en servicios, no solo en UI.

### Consecuencias
Se gana confianza tributaria; se asume complejidad de máquina de estados y reaperturas formales con motivo y autorización. Las reglas controvertidas (`Propuesta` en `DOMAIN.md`: R-005, R-108, R-204/R-205, R-403…R-405, redondeo R-502/R-504/R-505) solo se confirman con validación del contador/asesor y nuevo ADR si cambian.

---

## ADR-010 — Alcance v1 cerrado y MVP incremental: primero recolección, luego motor completo
**Fecha:** 2026-09-26
**Estado:** Aceptada

### Contexto
`PROJECT.md` define un v1 amplio (empresas, ejercicios, INPC versionado, partidas/movimientos, ambos motores, balance fiscal, importación/exportación, auditoría, RBAC) y pospone explícitamente a v2 los libros de compras/ventas, IVA, retenciones, inventarios/depreciación automática e integración contable. El `schema.prisma` real, sin embargo, implementa un MVP previo de recolección (`form_submissions`, `section_submissions`, `calculation_cases` con `initialBalances/movements/expectedResult/inpc`, `attachments` en Vercel Blob) aún sin `companies`/`fiscal_periods`/`fiscal_items`/`adjustment_calculations`.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Elegida: arranque incremental — MVP de recolección de casos y balances de ejemplo → luego motor fiscal completo según `DATABASE.md` | Valida reglas con el contador desde el día uno, desriesga fórmulas antes de construir el motor definitivo | Divergencia temporal entre `DATABASE.md` (diseño objetivo) y `schema.prisma` (MVP); requiere migraciones de reconciliación |
| Construir el motor completo de una vez | Sin divergencia | Parálisis por análisis, errores masivos, viola la regla del Paso 03 ("nunca la app completa de una vez") |
| Recortar el dominio fiscal del v1 | Menos trabajo | Pierde la propuesta de valor (trazabilidad + motores) |

### Decisión
Se mantiene el alcance v1 de `PROJECT.md` como objetivo, con una sola concesión de secuencia: el MVP vigente recolecta casos/soportes para validar el dominio, y cada bloque posterior (empresas → períodos → índices → partidas → motores → reportes) se construye por bloques pequeños con criterios de aceptación en `TODO.md` y checklist del Paso 04. V2 (compras, ventas, IVA, retenciones, integraciones) queda explícitamente fuera.

### Consecuencias
Se gana validación temprana a costa de una deuda de reconciliación esquema MVP→esquema fiscal que deberá migrarse con `prisma migrate` y documentarse aquí como ADR nuevo. `TODO.md` y `API.md` deben ponerse al día por bloque; hoy siguen en plantilla y son la principal deuda de documentación viva (Paso 07).

---

## ADR-011 — Reconciliación MVP↔fiscal: corte único sin coexistencia, auditoría unificada
**Fecha:** 2026-09-26
**Estado:** Aceptada

### Contexto
B-01 bloquea Fase 1: `prisma/schema.prisma` (MVP: `users.role ADMIN|RESPONDENT`, `sessions`, `form_submissions`, `attachments`, `audit_logs` propio) es incompatible con el modelo objetivo de `DATABASE.md` §3 (`roles`/`permissions`/`role_user`/`permission_role`, 5 roles, 16 tablas fiscales). La puerta del roadmap exige decidir destino de cada tabla, de los datos y el orden de migración antes de la primera migración fiscal. Dato verificado hoy por query directa: **la DB está vacía** (0 usuarios, 0 levantamientos, 0 adjuntos, 0 auditorías) — no hay datos que migrar, solo esquemas que reconciliar; el plan incluye pre-vuelo por si aparecen datos antes de ejecutar.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Elegida: corte único en una sola migración transaccional (reemplazo, sin coexistencia) | Una sola fuente de verdad por concepto; la migración es atómica (todo o nada); sin ramas de código dual | Si aparecen usuarios antes de ejecutar, el backfill debe estar probado (mitigado con pre-vuelo y mapping fijo) |
| Transición con coexistencia (`users.role` + tablas RBAC a la vez) | Cero riesgo de mapeo el día del corte | Dos fuentes de rol divergen inevitablemente — el mismo motivo por el que `DATABASE.md` §7.4 eliminó `rol_en_empresa`; duplica lógica de autorización y superficie de bugs |
| Tirar el MVP y recrear la DB desde cero | Simple | Destruye el historial de migraciones, invalida la Fase M cerrada y sus tests, y pierde los casos validados que alimentan Fase 5 |

### Decisión
1. **`users`:** se elimina la columna `role` (enum) y la autorización pasa a `roles`/`permissions`/`role_user`/`permission_role`. Se conservan las columnas MVP probadas (`name`, `active`, `lastLoginAt` — el código de sesión depende de `active`); **no** se agrega `estado` (`SUSPENDIDO ≡ active=false`). Si el pre-vuelo encuentra usuarios: backfill `ADMIN→administrador`, `RESPONDENT→analista` (reasignable luego en admin), después `DROP COLUMN`.
2. **`sessions`, `form_submissions`, `section_submissions`, `calculation_cases`, `attachments`:** se conservan tal cual, sin renombres (Fase M cerrada y testeada; los casos alimentan la validación de Fase 5).
3. **Datos:** nada que migrar (DB vacía verificada 2026-09-26). Pre-vuelo obligatorio antes de generar la migración: recontar `users`/`form_submissions`/`attachments`; si hay filas, ejecutar el backfill del punto 1.
4. **`audit_logs`:** se extiende la tabla existente (una sola bitácora append-only), no se crea `fiscal_audit_logs`: `ADD COLUMN company_id FK nullable`, `old_values`/`new_values Json nullable`; los nuevos valores de acción fiscal se agregan al enum con `ALTER TYPE ... ADD VALUE` (precedente: migración `20260926000002`). Se conservan los nombres MVP (`entity`, `metadata`); `DATABASE.md` §3 se alinea en Fase 1.1.
5. **`files`:** se crea según `DATABASE.md` para soportes fiscales (`documento_soporte_id`); `attachments` sigue solo para el levantamiento (su `submissionId` obligatorio no sirve a documentos fiscales).
6. **`company_user`:** se crea **sin** `rol_en_empresa` (confirma `DATABASE.md` §7.4); la pertenencia es solo el par `(company_id, user_id)`.
7. **Orden:** (1) este ADR → (2) editar `schema.prisma` (tablas fiscales + `users` sin `role` + `audit_logs` extendida; roles con ids fijos) → (3) un único `migrate diff` → revisión del SQL → deploy (una transacción; quirk P3005/shadow documentado en paso 3 de Fase M: baseline + diff + `db execute` + `resolve --applied`) → (4) extender `prisma/seed.ts` con permisos (Fase 1.2) → (5) re-correr la suite completa (39 tests) + humo de login. Rollback: restore Neon + `migrate resolve --rolled-back`.

### Consecuencias
Se gana un corte limpio y reversible con una sola bitácora y un solo sistema de roles; se asume re-escribir las guardas de autorización a 5 roles en Fase 1.2 (el chequeo `role !== 'ADMIN'` del MVP deja de compilar conceptualmente — es intencional y está cubierto por la suite). `DATABASE.md` §3 (`users`, `audit_logs`) debe alinearse al ejecutar Fase 1.1; esa alineación es criterio de aceptación del bloque, no de este ADR.

---

## ADR-012 — Endurecimiento con medios propios: rate limiting en memoria, headers y Origin
**Fecha:** 2026-09-26
**Estado:** Aceptada

### Contexto
B-03 bloqueaba el release (sin rate limiting, headers ni CSRF) y `SECURITY.md` pedía registrar la activación como ADR. Había que elegir entre infraestructura externa (Vercel KV/Upstash, WAF) e implementación propia antes del release.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Elegida: librería propia en memoria + headers en `next.config.ts` + chequeo `Origin` en `proxy.ts` | Cero dependencias y costo, testeable en CI, suficiente para el volumen v1 | El store no se comparte entre instancias (presupuesto multiplicable por réplica); HSTS/CSP requieren revisión al agregar dominios/CDN |
| Vercel KV/Upstash + WAF gestionado | Límites distribuidos reales, menos código propio | Costo, latencia extra por request, otra superficie de secretos antes del primer release |

### Decisión
Se implementa la tabla exacta de `SECURITY.md` con `src/lib/security/rate-limit.ts` (ventana deslizante, 429 + `Retry-After`), headers en `next.config.ts` y `src/lib/security/origin.ts` aplicado a mutaciones `/api/*` en el proxy (sin `Origin` se permite para no romper curl/tests; Server Actions quedan cubiertas por el CSRF del framework).

### Consecuencias
Se cierra B-03 sin dependencias nuevas salvo `pdfkit` (Fase 6); queda en backlog el paso a store distribuido si el multi-instancia lo exige, y re-auditar CSP al abrir `/api/v1` a terceros en v2.

---

## ADR-013 — Backend de archivos: UploadThing como principal, Vercel Blob como alternativa
**Fecha:** 2026-09-27
**Estado:** Aceptada

### Contexto
No hay certeza de poder usar Vercel Blob en el entorno de despliegue del proyecto. Se necesita un backend de archivos disponible con certeza para adjuntos del levantamiento y originales de importación (`ARCHITECTURE.md` §6.2). El proyecto ya tenía `UPLOADTHING_TOKEN`/`UPLOADTHING_API` en `.env` sin cablear.

### Alternativas consideradas
| Opción | Pros | Contras |
|---|---|---|
| Elegida: UploadThing (vía `UTApi`) como principal, Vercel Blob como alternativa, local como fallback | Disponible con certeza, SDK oficial sin infraestructura propia, un solo punto de cambio (`src/lib/storage/blob.ts`) | URLs servidas con ACL pública de UploadThing (enlaces no adivinables; el control de acceso real sigue en `GET /api/files/[id]`) |
| Solo Vercel Blob | Ya integrado, `access: "private"` nativo | Disponibilidad incierta en el despliegue previsto (bloqueó la importación con `Access denied`) |
| Solo local | Cero dependencias | Sin persistencia entre instancias, inaceptable en producción |

### Decisión
Prioridad en `src/lib/storage/blob.ts`: `UPLOADTHING_TOKEN` → UploadThing (`src/lib/storage/uploadthing.ts`); si no, `BLOB_READ_WRITE_TOKEN` → Vercel Blob; si ninguno, fallback local (solo desarrollo/tests). `POST /api/uploads` usa la capa unificada en vez de `put()` directo.

### Consecuencias
Se gana disponibilidad del almacenamiento sin reescribir llamadas (misma firma `{ url, pathname }`); se asume URL pública no adivinable por ahora (decisión 2026-09-27: se mantiene pública durante desarrollo con datos de prueba) y la autorización vive en el proxy `GET /api/files/[id]`, nunca en la URL. Al operar con datos reales, migrar a ACL privada + URLs firmadas de corta duración.

---

*(agregar una entrada nueva por cada ADR, numerada consecutivamente)*
