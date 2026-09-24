# SPEC-DRIVEN STAFF ENGINEER

## Sistema de Ajuste por inflación fiscal inicial y regulares

### Subtítulo funcional

**Formulario de levantamiento inicial**

---

# 1. Mandato del agente

Construir una aplicación web de levantamiento funcional y documental para definir los requerimientos de un sistema denominado:

> **Sistema de Ajuste por inflación fiscal inicial y regulares**

La aplicación debe recopilar información estructurada sobre alcance tributario/contable, fuentes de datos, reglas de cálculo, casos de prueba, reportes, controles operativos y documentación de soporte.

El producto debe ser una aplicación web profesional, segura, persistente y desplegable en Vercel, con PostgreSQL sobre Neon.

El agente debe trabajar como **Staff Engineer** y no como generador de código indiscriminado.

### Reglas de implementación obligatorias

1. Respetar estrictamente el stack definido.
2. No introducir una arquitectura alternativa sin justificación.
3. No utilizar `middleware.ts`.
4. Utilizar `proxy.ts` para las responsabilidades de Proxy de Next.js 16.
5. No depender de `proxy.ts` como única capa de autorización.
6. Las comprobaciones reales de sesión, permisos y propiedad de datos deben ejecutarse en Server Actions, Route Handlers y Server Components según corresponda.
7. No almacenar archivos binarios en PostgreSQL.
8. Utilizar almacenamiento privado de Vercel Blob para documentación adjunta.
9. Persistir en PostgreSQL solamente metadatos de los archivos y referencias al Blob.
10. Validar datos tanto en cliente como en servidor.
11. Toda mutación crítica debe tener validación server-side.
12. No confiar en datos enviados desde el navegador.
13. No utilizar estados globales innecesarios.
14. Mantener separación clara entre UI, dominio, validación, persistencia y autenticación.
15. TypeScript debe ejecutarse en modo estricto.
16. No utilizar `any` salvo justificación explícita y localizada.
17. Los textos funcionales del formulario deben conservar la semántica y terminología del levantamiento original.
18. No cambiar silenciosamente preguntas, opciones o validaciones.
19. Los cambios de esquema deben realizarse mediante migraciones Prisma.
20. No ejecutar migraciones destructivas automáticamente en entornos con datos.

---

# 2. Stack tecnológico canónico

## Frontend / aplicación

* Next.js 16.x
* React 19.x
* TypeScript
* App Router
* `proxy.ts`
* Tailwind CSS 4.x

## Backend

* Next.js Route Handlers
* Next.js Server Actions
* Server Components por defecto
* Client Components solamente cuando exista una necesidad real de interacción

## Persistencia

* PostgreSQL
* Neon.tech
* Prisma ORM 7.x
* Driver adapter compatible con Neon

Prisma 7 exige utilizar un driver adapter y genera el cliente mediante el nuevo generador `prisma-client`.

## Autenticación

* Sesiones persistentes
* Cookie `httpOnly`
* `secure` en producción
* `SameSite=Lax`
* Cookie con `Path=/`
* Token de sesión opaco, aleatorio y de alta entropía
* Persistencia de la sesión en PostgreSQL

## Archivos

* Vercel Blob
* Store privado
* Upload directo desde cliente para archivos grandes
* Metadatos almacenados en PostgreSQL

Los documentos del levantamiento pueden llegar a 20 MB por archivo, por lo que el flujo no debe transportar el archivo completo a través de una Vercel Function.

## Hosting

* Vercel

---

# 3. Objetivo del producto

Crear una plataforma para realizar un levantamiento inicial previo al desarrollo de un sistema especializado en ajustes por inflación fiscal inicial y regulares.

El formulario debe permitir:

* Recopilar requerimientos.
* Identificar perfiles de usuario.
* Definir permisos.
* Delimitar alcance fiscal y contable.
* Identificar procesos y partidas.
* Documentar fuentes de datos.
* Documentar fuente oficial del INPC.
* Registrar criterios y fórmulas.
* Registrar casos reales de cálculo.
* Adjuntar documentación.
* Definir reportes esperados.
* Registrar controles operativos.
* Definir volumen, empresas, usuarios e histórico.
* Registrar requerimientos de despliegue.
* Recopilar ejemplos anonimizados.
* Identificar responsables de validación.

---

# 4. Concepto de dominio

La entidad principal debe denominarse:

```text
FormSubmission
```

Una instancia representa un levantamiento completo realizado por un usuario.

La instancia debe contener cinco secciones:

```text
Section 1
Section 2
Section 3
Section 4
Section 5
```

Cada sección tiene estado independiente:

```text
DRAFT
SUBMITTED
REOPENED
```

El levantamiento completo puede tener:

```text
IN_PROGRESS
COMPLETED
REVIEW
APPROVED
ARCHIVED
```

No confundir:

* tipos de usuario declarados en el cuestionario;
* roles de seguridad de la aplicación.

Son conceptos diferentes.

---

# 5. Roles de aplicación

Para el MVP implementar:

## ADMIN

Puede:

* Crear usuarios.
* Desactivar usuarios.
* Consultar levantamientos.
* Abrir levantamientos.
* Reabrir secciones.
* Descargar archivos autorizados.
* Revisar respuestas.
* Exportar información.
* Consultar auditoría.

## RESPONDENT

Puede:

* Acceder a sus levantamientos.
* Completar secciones.
* Guardar borradores.
* Adjuntar documentos.
* Enviar secciones.
* Consultar sus propias respuestas.
* Corregir una sección mientras esté en `DRAFT`.
* Continuar una sección reabierta por administración.

Los valores:

> Administrador, Analista contable, Contador, Asesor tributario, Supervisor, Cliente final, Auditor, Otro

pertenecen al **contenido del levantamiento**, no a los roles técnicos de la aplicación.

---

# 6. Flujo principal

## Entrada

Ruta inicial:

```text
/
```

Debe mostrar:

* Nombre del sistema.
* Subtítulo.
* Descripción.
* Estado de autenticación.
* Acción para comenzar o continuar.

Título:

```text
Sistema de Ajuste por inflación fiscal inicial y regulares
```

Subtítulo:

```text
Formulario de levantamiento inicial
```

---

# 7. Rutas

Implementar la siguiente estructura conceptual:

```text
/
├── login
├── dashboard
│   ├── submissions
│   └── submissions/[id]
│       ├── section/1
│       ├── section/2
│       ├── section/3
│       ├── section/4
│       └── section/5
├── admin
│   ├── users
│   ├── submissions
│   └── audit
└── api
    ├── uploads
    ├── files/[id]
    └── auth
```

No es obligatorio respetar literalmente esta estructura si el agente obtiene una estructura mejor, pero las responsabilidades deben mantenerse separadas.

---

# 8. Navegación del formulario

En desktop:

```text
1. Objetivo y usuario
        ↓
2. Alcance tributario y contable
        ↓
3. Datos y cálculo
        ↓
4. Reportes, controles y entrega
        ↓
5. Material adjunto
```

En mobile utilizar stepper vertical o indicador compacto.

Mostrar siempre:

```text
Sección X de 5
```

y porcentaje:

```text
20%
40%
60%
80%
100%
```

El progreso debe representar la completitud real de las secciones y no únicamente la navegación visual.

---

# 9. Persistencia y borradores

Cada sección debe soportar:

```text
Guardar borrador
Enviar sección
```

El usuario debe poder abandonar la página y continuar posteriormente.

Cuando sea posible, implementar autosave con debounce para campos grandes, pero:

* no sobrescribir silenciosamente una respuesta enviada;
* no generar una petición por cada pulsación;
* preservar la última versión válida.

El almacenamiento de borrador debe ejecutarse en servidor.

---

# 10. Formularios

---

## FORMULARIO 1 — Objetivo y usuario

### Propósito

Recopilar el objetivo del sistema y los perfiles/permisos de usuario.

### Campo 1

**Objetivo principal del sistema**

Tipo:

```text
textarea
```

Obligatorio:

```text
true
```

Validación:

```text
min: 30
max: 500
```

Placeholder:

```text
Ej: hacer cálculos que hoy se llevan en Excel, reducir errores, generar soportes para ISLR, centralizar información.
```

### Campo 2

**Tipos de usuario previstos**

Tipo:

```text
multiselect
```

Obligatorio:

```text
true
```

Opciones:

```text
Administrador
Analista contable
Contador
Asesor tributario
Supervisor
Cliente final
Auditor
Otro
```

Si se selecciona `Otro`:

**Especifique otro tipo de usuario**

```text
text
required
max 150
```

### Campo 3

**Permisos por tipo de usuario**

```text
textarea
required
min 30
max 1000
```

Texto de ayuda:

```text
Indique qué puede hacer cada perfil: cargar, editar, calcular, aprobar, cerrar períodos, exportar o solo consultar.
```

### Submit

```text
Enviar sección 1
```

Confirmación:

```text
Gracias. Sección 1 recibida.
```

---

# 11. FORMULARIO 2 — Alcance tributario y contable

### Propósito

Definir alcance fiscal/contable, procesos y partidas.

## Campo 1 — Alcance del ajuste

Tipo:

```text
radio
```

Obligatorio.

Opciones:

```text
Solo ajuste fiscal LISLR
Ajuste fiscal y contable/financiero
No estoy seguro
Otro
```

Condicional:

Si:

```text
Ajuste fiscal y contable/financiero
```

mostrar:

```text
Separación de cálculos, libros y reportes
```

Tipo:

```text
textarea
required
max 1000
```

Si:

```text
Otro
```

mostrar:

```text
Especifique otro alcance
```

```text
text
required
max 200
```

---

## Campo 2 — Procesos incluidos en la primera versión

Tipo:

```text
multiselect
```

Obligatorio:

```text
mínimo 1
```

Opciones:

```text
Ajuste inicial
Reajuste regular anual
RAR
Cálculo de obligaciones asociadas
Depreciación/amortización fiscal
Movimientos de patrimonio
Altas y bajas de activos
Inventarios
Pasivos no monetarios
Conciliación fiscal
Exportación ISLR
Otro
```

Si se selecciona `Otro`:

```text
Especifique otro proceso
```

```text
text
required
max 200
```

---

## Campo 3 — Tipos de partidas a procesar

Tipo:

```text
multiselect
```

Mínimo:

```text
1
```

Opciones:

```text
Activos fijos
Inventarios
Inmuebles
Intangibles
Inversiones
Construcción en proceso
Deudas de largo plazo
Capital social
Reservas
Resultados acumulados
Aportes
Dividendos
Otro
```

Condicional:

```text
Especifique otro tipo de partida
```

```text
text
required
max 200
```

---

## Campo 4 — Partidas que deben excluirse

```text
textarea
required
min 20
max 500
```

Submit:

```text
Enviar sección 2
```

Confirmación:

```text
Gracias. Sección 2 recibida.
```

---

# 12. FORMULARIO 3 — Datos y cálculo

### Propósito

Definir origen de datos, INPC, criterios y casos de cálculo.

## Campo 1 — Origen de los datos

Tipo:

```text
multiselect
```

Mínimo:

```text
1
```

Opciones:

```text
Carga manual
Excel/CSV
Sistema administrativo-contable
API
Archivos exportados
Otro
```

Si se selecciona cualquiera de:

```text
Sistema administrativo-contable
API
Archivos exportados
```

mostrar:

### Sistemas intervinientes

```text
textarea
required
max 500
```

### Adjuntar ejemplos anonimizados

```text
multiple file upload
optional
```

Extensiones:

```text
.xls
.xlsx
.csv
.pdf
```

Máximo:

```text
20 MB por archivo
```

Si se selecciona `Otro`:

```text
Especifique otro origen
```

```text
text
required
max 200
```

---

# 13. Fuente oficial del INPC

Campo:

```text
Fuente oficial del INPC
```

Tipo:

```text
radio
```

Opciones:

```text
Carga manual
Importación desde Excel
Fuente externa
Validación por administrador
Otro
```

Si `Fuente externa`:

```text
URL o API de la fuente
```

```text
text
required
max 300
```

Si `Otro`:

```text
Especifique otra fuente
```

```text
text
required
max 200
```

---

# 14. Responsable de aprobar los índices INPC

```text
text
required
max 200
```

---

# 15. Criterios, fórmulas y reglas de cálculo

```text
textarea
required
min 50
max 2000
```

No interpretar automáticamente la información ni modificarla.

Este campo almacena el criterio declarado por el usuario.

---

# 16. Casos de cálculo

Implementar un **grupo repetible**.

Mínimo:

```text
3 casos
```

Debe existir inicialmente un mecanismo para:

```text
Agregar caso
Eliminar caso
Duplicar caso
Editar caso
```

No permitir enviar la sección con menos de tres casos.

El levantamiento establece explícitamente que deben existir al menos tres casos.

## Estructura de cada caso

### Tipo de caso

Opciones:

```text
Ajuste inicial
Reajuste con aumento neto de patrimonio
Reajuste con disminución neta
Otro
```

Si `Otro`:

```text
Especifique tipo de caso
```

Obligatorio.

### Nombre o identificador

```text
text
required
max 200
```

### Saldos iniciales

```text
textarea
required
```

### Fechas

```text
date
required
```

El modelo debe estar preparado para almacenar fecha ISO.

### INPC

```text
number
required
positive
max 4 decimals
```

No almacenar el INPC exclusivamente como `float`.

Utilizar tipo decimal apropiado en PostgreSQL/Prisma.

### Movimientos

```text
textarea
required
```

### Resultado esperado

```text
textarea
required
```

### Explicación de la regla aplicada

```text
textarea
required
```

### Archivo del caso

Opcional.

Formatos:

```text
.xls
.xlsx
.csv
.pdf
.docx
```

Máximo:

```text
20 MB
```

Submit:

```text
Enviar sección 3
```

Confirmación:

```text
Gracias. Sección 3 recibida.
```

---

# 17. FORMULARIO 4 — Reportes, controles y entrega

### Propósito

Definir reportes requeridos, controles operativos y condiciones de entrega.

## Campo 1 — Reportes, documentos y exportaciones requeridos

Tipo:

```text
multiselect
```

Mínimo:

```text
1
```

Opciones:

```text
Hoja detallada de cálculo por partida
Balance General Fiscal Actualizado
RAR
Conciliación fiscal
Resumen para declaración ISLR
Asiento contable sugerido
Expediente por empresa/período
Informe PDF
Exportación Excel/CSV
Formatos específicos para clientes/contadores/SENIAT
Otro
```

Si:

```text
Formatos específicos para clientes/contadores/SENIAT
```

mostrar:

```text
Detalle de formatos específicos
```

```text
textarea
required
max 1000
```

Si:

```text
Otro
```

mostrar:

```text
Especifique otro reporte/exportación
```

```text
text
required
max 200
```

---

# 18. Limitaciones, controles y requisitos operativos

Todos los subcampos son obligatorios salvo donde se indique lo contrario.

## Cantidad estimada de empresas

```text
integer
required
min 0
```

## Cantidad estimada de usuarios

```text
integer
required
min 0
```

## Años históricos a cargar

```text
integer
required
min 0
```

## Volumen de activos y movimientos

```text
textarea
required
max 500
```

## Operación multiempresa

```text
boolean
required
```

## Auditoría de cambios

```text
boolean
required
```

## Bloqueo de períodos cerrados

```text
boolean
required
```

## Flujo de revisión y aprobación

```text
textarea
required
max 1000
```

## Respaldo de documentos

```text
boolean
required
```

## Permisos

```text
textarea
required
max 1000
```

## Disponibilidad requerida

```text
text
required
max 200
```

## Despliegue

Opciones:

```text
Web
Local
Ambos
```

## Idioma

Opciones:

```text
Español
Inglés
Otro
```

Si `Otro`:

```text
Especifique idioma
```

## Moneda

Opciones:

```text
VES
USD
EUR
Otra
```

Si `Otra`:

```text
Especifique moneda
```

## Redondeos

```text
text
required
max 200
```

## Presupuesto estimado

```text
text | number
optional
```

## Fecha objetivo

```text
date
optional
```

## Fases de entrega

```text
textarea
required
max 1000
```

Submit:

```text
Enviar sección 4
```

Confirmación:

```text
Gracias. Sección 4 recibida.
```

---

# 19. FORMULARIO 5 — Material adjunto

### Propósito

Recopilar documentación de soporte para el levantamiento.

Todos los archivos deben almacenarse en un Blob Store privado.

No almacenar los binarios en PostgreSQL.

---

## 1. Excel real anonimizado de ajuste inicial y/o regular

Obligatorio.

Múltiples archivos.

```text
.xls
.xlsx
.csv
```

Máximo:

```text
20 MB por archivo
```

---

## 2. Balance de comprobación o balance general de ejemplo

Obligatorio.

Formatos:

```text
.xls
.xlsx
.csv
.pdf
```

Máximo:

```text
20 MB
```

---

## 3. Plan de cuentas contable y clasificación fiscal

Obligatorio.

Formatos:

```text
.xls
.xlsx
.csv
.pdf
```

Máximo:

```text
20 MB
```

---

## 4. Ejemplos de reportes finales

Obligatorio.

Múltiples archivos.

Formatos:

```text
.xls
.xlsx
.csv
.pdf
.docx
```

Máximo:

```text
20 MB por archivo
```

---

## 5. Caso calculado y revisado con resultado esperado

Obligatorio.

Formatos:

```text
.xls
.xlsx
.csv
.pdf
.docx
```

Máximo:

```text
20 MB
```

---

## 6. Marco legal, manual, plantilla o criterio profesional

Obligatorio.

Múltiples archivos.

Formatos:

```text
.pdf
.docx
.xls
.xlsx
.csv
```

Máximo:

```text
20 MB por archivo
```

---

## 7. Lista de empresas tipo

Texto obligatorio.

```text
textarea
max 1000
```

Ayuda:

```text
Incluya actividad económica, cierre fiscal, tamaño aproximado y particularidades.
```

Archivo opcional:

```text
.xls
.xlsx
.csv
.pdf
```

---

## 8. Personas que validarán los resultados antes de producción

```text
textarea
required
max 500
```

Submit:

```text
Enviar material adjunto
```

Confirmación:

```text
Gracias. Material adjunto recibido.
```

---

# 20. Modelo de datos

No crear una tabla por cada pregunta.

Usar una estructura híbrida:

```text
User
Session
FormSubmission
SectionSubmission
CalculationCase
Attachment
AuditLog
```

---

# 21. Modelo User

Campos conceptuales:

```text
id
email
name
passwordHash
role
active
createdAt
updatedAt
lastLoginAt
```

`email` debe ser único.

Role:

```text
ADMIN
RESPONDENT
```

---

# 22. Modelo Session

Campos:

```text
id
userId
tokenHash
expiresAt
createdAt
lastSeenAt
userAgent
ipAddress
```

Nunca almacenar el token de sesión en texto plano.

La cookie debe contener únicamente el token de sesión.

El servidor debe calcular el hash del token recibido y buscar el registro correspondiente.

---

# 23. Modelo FormSubmission

Campos:

```text
id
userId
title
status
currentSection
createdAt
updatedAt
submittedAt
completedAt
```

`title` puede contener inicialmente:

```text
Sistema de Ajuste por inflación fiscal inicial y regulares
```

---

# 24. Modelo SectionSubmission

Campos:

```text
id
submissionId
sectionNumber
status
answers
createdAt
updatedAt
submittedAt
version
```

Restricción:

```text
unique(submissionId, sectionNumber)
```

`answers` debe utilizar JSONB/PostgreSQL mediante Prisma `Json`.

La validación semántica se ejecutará con esquemas Zod separados por sección.

---

# 25. Modelo CalculationCase

Campos:

```text
id
sectionSubmissionId
position
caseType
otherCaseType
identifier
initialBalances
date
inpc
movements
expectedResult
ruleExplanation
createdAt
updatedAt
```

`inpc` debe utilizar Decimal.

La posición:

```text
position
```

permite mantener el orden de presentación.

---

# 26. Modelo Attachment

Campos mínimos:

```text
id
submissionId
sectionNumber
calculationCaseId nullable

category
originalName
pathname
blobUrl
mimeType
extension
sizeBytes

uploadedById

createdAt
deletedAt
```

Nunca permitir que el cliente determine arbitrariamente:

```text
pathname
category
submissionId
userId
```

El servidor debe comprobar la asociación.

---

# 27. Categorías de archivo

Definir enum de dominio:

```text
DATA_EXAMPLE
CALCULATION_CASE
BALANCE
CHART_OF_ACCOUNTS
FINAL_REPORT
REVIEWED_CASE
LEGAL_FRAMEWORK
COMPANY_LIST
OTHER
```

---

# 28. Modelo AuditLog

Registrar como mínimo:

```text
id
userId
submissionId nullable
action
entity
entityId
metadata
createdAt
ipAddress
userAgent
```

Eventos mínimos:

```text
LOGIN
LOGOUT
SUBMISSION_CREATED
SECTION_DRAFT_SAVED
SECTION_SUBMITTED
SECTION_REOPENED
FILE_UPLOADED
FILE_DELETED
FILE_DOWNLOADED
USER_CREATED
USER_DEACTIVATED
```

Nunca registrar:

* contraseñas;
* tokens;
* cookies;
* contenido sensible completo de archivos.

---

# 29. Validación

Crear esquemas:

```text
lib/validation/
├── auth.ts
├── section-1.ts
├── section-2.ts
├── section-3.ts
├── section-4.ts
├── section-5.ts
├── calculation-case.ts
└── attachment.ts
```

La validación debe utilizarse:

```text
Browser
    ↓
Zod
    ↓
Server Action / Route Handler
    ↓
Zod nuevamente
    ↓
Domain service
    ↓
Prisma
```

Nunca confiar únicamente en React.

---

# 30. Lógica condicional

No implementar condiciones mediante lógica duplicada entre múltiples componentes.

Centralizar reglas de visibilidad en definiciones declarativas.

Ejemplo conceptual:

```text
field:
  id: otherUserType
  visibleWhen:
    userTypes contains OTHER
```

Esto facilitará:

* validación;
* renderizado;
* testing;
* mantenimiento.

---

# 31. Arquitectura de componentes

Estructura conceptual:

```text
components/
├── form/
│   ├── FormShell
│   ├── FormHeader
│   ├── FormProgress
│   ├── SectionCard
│   ├── SectionActions
│   ├── ConditionalField
│   ├── FieldError
│   └── DraftStatus
│
├── fields/
│   ├── TextField
│   ├── TextareaField
│   ├── RadioGroupField
│   ├── CheckboxGroupField
│   ├── SelectField
│   ├── DateField
│   ├── DecimalField
│   ├── FileUploader
│   └── Repeater
│
├── cases/
│   ├── CalculationCaseList
│   ├── CalculationCaseCard
│   └── CalculationCaseFields
│
└── layout/
    ├── AppShell
    ├── Sidebar
    └── Header
```

---

# 32. Server Actions

Utilizar Server Actions para operaciones como:

```text
createSubmission()
saveSectionDraft()
submitSection()
reopenSection()
deleteAttachment()
createUser()
deactivateUser()
logout()
```

Todas deben:

1. Obtener la sesión.
2. Verificar autorización.
3. Validar entrada.
4. Ejecutar operación de dominio.
5. Registrar auditoría cuando corresponda.
6. Revalidar la UI relevante.

---

# 33. Route Handlers

Utilizar Route Handlers para operaciones HTTP donde sean apropiados.

Ejemplos:

```text
POST /api/uploads/client
GET  /api/files/[id]
POST /api/auth/login
POST /api/auth/logout
```

No utilizar Route Handlers como sustituto obligatorio de Server Actions.

Elegir la tecnología según la naturaleza de la operación.

---

# 34. Arquitectura de autenticación

Implementar sesión de servidor.

Cookie conceptual:

```text
__Host-session
```

Propiedades:

```text
httpOnly=true
secure=true en producción
sameSite=lax
path=/
```

No usar:

```text
localStorage
sessionStorage
JWT almacenado en localStorage
```

La sesión debe:

1. Generar token aleatorio.
2. Calcular hash.
3. Persistir hash en PostgreSQL.
4. Enviar token al navegador como cookie.
5. Resolver usuario en cada operación protegida.

---

# 35. Responsabilidad de proxy.ts

`proxy.ts` puede:

* Detectar ausencia de cookie.
* Redirigir rutas protegidas.
* Aplicar controles optimistas.
* Separar rutas públicas/privadas.

Pero no debe ser la única comprobación de autorización.

La documentación de Next.js 16 establece que Proxy es apropiado para lógica previa de request y redirects, pero no debe utilizarse como solución completa de gestión de sesiones/autorización.

Las comprobaciones definitivas se hacen dentro de:

```text
Server Actions
Route Handlers
Server Components
Domain services
```

---

# 36. Almacenamiento de archivos

Utilizar:

```text
Vercel Blob Private Store
```

No utilizar almacenamiento público.

Los archivos del levantamiento pueden contener:

* información contable;
* información fiscal;
* documentación empresarial;
* criterios profesionales;
* archivos de clientes.

Por tanto, el acceso debe requerir autenticación.

Vercel documenta el almacenamiento privado precisamente para contenido sensible y aplicaciones con autenticación personalizada.

---

# 37. Upload workflow

No ejecutar:

```text
Browser
   ↓
Next.js Function
   ↓
20 MB file
```

En su lugar:

```text
Browser
   ↓
request upload authorization
   ↓
Next.js
   ↓
validate session + section + MIME + size
   ↓
signed/client upload
   ↓
Vercel Blob
   ↓
return blob metadata
   ↓
Next.js persists metadata
```

Esto evita exceder el límite de payload de Vercel Functions.

---

# 38. Seguridad de archivos

Validar:

* extensión;
* MIME;
* tamaño;
* cantidad máxima de archivos;
* usuario propietario;
* submission;
* sección;
* categoría.

Lista blanca de extensiones permitidas:

```text
xls
xlsx
csv
pdf
docx
```

No aceptar:

```text
exe
js
sh
bat
cmd
php
html
svg
```

No ejecutar archivos.

No interpretar automáticamente macros de Excel.

No procesar documentos en servidor durante el MVP salvo que sea estrictamente necesario.

---

# 39. Descarga de archivos

Un usuario solamente puede acceder a archivos a los cuales tiene permiso.

Flujo:

```text
GET /api/files/:id
        ↓
authenticate
        ↓
authorize
        ↓
load Attachment
        ↓
get private Blob
        ↓
stream response
```

Nunca devolver al navegador un enlace público de Blob para documentación sensible.

Vercel documenta que los blobs privados no son accesibles mediante URL pública y deben servirse mediante una ruta autenticada.

---

# 40. PostgreSQL / Prisma

Configurar Prisma ORM 7 utilizando:

```text
prisma/schema.prisma
prisma7.config.ts
```

o la variante compatible con la versión exacta instalada.

No escribir:

```ts
new PrismaClient()
```

sin adapter cuando corresponda a Prisma 7.

Para Neon utilizar el adapter correspondiente de Prisma:

```text
@prisma/adapter-neon
```

Prisma 7 documenta específicamente el uso de adapters para PostgreSQL y Neon.

---

# 41. Variables de entorno

Definir como mínimo:

```text
DATABASE_URL
DIRECT_URL

BLOB_READ_WRITE_TOKEN

APP_URL

SESSION_COOKIE_NAME
SESSION_TTL_DAYS
```

Para bootstrap administrativo, nunca hardcodear credenciales.

Puede utilizarse:

```text
INITIAL_ADMIN_EMAIL
INITIAL_ADMIN_PASSWORD
```

solo durante un proceso controlado de inicialización.

Después del bootstrap se recomienda eliminar las credenciales temporales del entorno.

---

# 42. Configuración Neon

Separar:

```text
DATABASE_URL
```

para ejecución de aplicación y:

```text
DIRECT_URL
```

para operaciones administrativas/migraciones cuando la configuración de Neon lo requiera.

El agente debe verificar la configuración final contra el connection string real del proyecto antes de ejecutar migraciones.

---

# 43. UI/UX

Diseño:

* Corporativo.
* Profesional.
* Sobrio.
* Alta legibilidad.
* Responsive.
* Mobile-first.
* Accesible.
* Sin apariencia de formulario genérico de Google Forms.

Utilizar:

```text
Tailwind CSS 4
```

Crear componentes consistentes.

---

# 44. Encabezado

Debe mostrar:

```text
Sistema de Ajuste por inflación fiscal inicial y regulares
```

y debajo:

```text
Formulario de levantamiento inicial
```

No modificar estos textos sin autorización.

---

# 45. Experiencia de entrada

Cada sección debe presentar:

```text
Título
Propósito
Campos
Ayudas contextuales
Validaciones
Estado del borrador
Acciones
```

Los mensajes de error deben estar junto al campo y ser específicos.

Evitar mensajes genéricos como:

```text
Error de formulario
```

Preferir:

```text
El objetivo principal debe contener al menos 30 caracteres.
```

---

# 46. Estado de envío

Cada sección debe mostrar claramente:

```text
Borrador
Guardando...
Guardado
Enviando...
Enviado
```

Nunca dejar al usuario sin feedback durante una operación.

---

# 47. Confirmaciones

Al enviar una sección mostrar:

```text
Gracias. Sección X recibida.
```

respetando el mensaje solicitado para cada sección.

No cerrar automáticamente la sesión.

Ofrecer:

```text
Continuar con siguiente sección
Volver al panel
```

---

# 48. Accesibilidad

Implementar como mínimo:

* labels explícitos;
* `aria-describedby` para ayudas/errores;
* navegación por teclado;
* estados de foco visibles;
* contraste adecuado;
* botones accesibles;
* mensajes de error vinculados al campo;
* soporte para lectores de pantalla;
* no depender exclusivamente de color para estados.

---

# 49. Manejo de errores

No exponer:

* stack traces;
* queries SQL;
* tokens;
* secretos;
* información interna de infraestructura.

El usuario debe recibir mensajes funcionales.

Ejemplo:

```text
No fue posible guardar la sección.
Verifique su conexión e inténtelo nuevamente.
```

El servidor debe registrar el error técnico internamente.

---

# 50. Concurrencia

El backend debe proteger contra:

* doble envío;
* doble click;
* múltiples uploads simultáneos inválidos;
* actualización simultánea de una sección.

Implementar mecanismos como:

```text
version
updatedAt
idempotency keys
```

cuando corresponda.

Una sección enviada no debe ser sobrescrita accidentalmente por un request atrasado.

---

# 51. Reglas de negocio

## Sección 1

No enviar si:

```text
objective.length < 30
```

o:

```text
permissions.length < 30
```

o:

```text
userTypes.length === 0
```

Si `Otro` está seleccionado:

```text
otherUserType obligatorio
```

---

## Sección 2

Debe seleccionarse:

```text
alcance
```

al menos un:

```text
proceso
```

y al menos un:

```text
tipo de partida
```

Los campos condicionales se vuelven obligatorios únicamente cuando la opción correspondiente está seleccionada.

---

## Sección 3

Debe existir:

```text
>= 3 CalculationCase
```

Todos deben ser válidos.

El INPC debe ser:

```text
> 0
```

y con máximo cuatro decimales.

---

## Sección 4

Debe existir al menos un reporte.

Todos los campos operativos requeridos deben estar completos.

---

## Sección 5

Todos los documentos marcados como obligatorios deben haber sido efectivamente registrados como attachments válidos.

No basta con que el navegador haya seleccionado un archivo.

---

# 52. Estado de integridad de archivos

Un archivo debe pasar por:

```text
SELECTED
UPLOADING
UPLOADED
REGISTERED
FAILED
DELETED
```

No considerar un archivo obligatorio completado hasta:

```text
REGISTERED
```

Es decir:

```text
Blob creado
+
metadatos persistidos
+
asociación correcta con submission/section
```

---

# 53. Administración

Crear dashboard administrativo con:

```text
Levantamientos
Usuarios
Auditoría
```

Dashboard de levantamientos:

Columnas:

```text
Participante
Estado
Sección actual
Progreso
Última actualización
Creado
```

Filtros:

```text
Estado
Usuario
Fecha
```

---

# 54. Vista administrativa de submission

Debe poder visualizar:

```text
Resumen
Sección 1
Sección 2
Sección 3
Sección 4
Sección 5
Archivos
Auditoría
```

Para sección 3 mostrar los casos como tarjetas independientes.

---

# 55. Exportación

El MVP debe contemplar al menos exportación estructurada de un levantamiento.

Formato recomendado:

```text
JSON
```

y posteriormente:

```text
XLSX
PDF
```

No mezclar la generación de documentos con el almacenamiento principal.

---

# 56. Auditoría

Toda acción relevante debe quedar registrada.

Ejemplo:

```text
USER_CREATED
SECTION_SUBMITTED
SECTION_REOPENED
FILE_UPLOADED
FILE_DOWNLOADED
```

Un ADMIN puede consultar la auditoría.

Un RESPONDENT no puede visualizarla.

---

# 57. Capa de dominio

No colocar toda la lógica en Server Actions.

Crear servicios de dominio:

```text
lib/domain/
├── submissions.ts
├── sections.ts
├── calculation-cases.ts
├── attachments.ts
├── auth.ts
└── audit.ts
```

El flujo recomendado:

```text
Server Action
      ↓
Auth
      ↓
Validation
      ↓
Domain Service
      ↓
Prisma
      ↓
Audit
```

---

# 58. Regla arquitectónica crítica

Los componentes React nunca deben acceder directamente a Prisma.

Incorrecto:

```text
React Component
   ↓
Prisma
```

Correcto:

```text
React Component
   ↓
Server Action
   ↓
Domain Service
   ↓
Prisma
```

---

# 59. Cache y datos dinámicos

Las páginas del formulario son altamente dinámicas.

No cachear respuestas privadas de usuarios entre sesiones.

El agente debe revisar explícitamente:

```text
dynamic rendering
cookies()
headers()
revalidate
cache behavior
```

cuando una página dependa de sesión.

---

# 60. No usar middleware

Prohibido crear:

```text
middleware.ts
```

Usar:

```text
proxy.ts
```

Next.js 16 cambió formalmente el nombre y comportamiento de esta convención.

---

# 61. Testing

Implementar tres niveles.

## Unit tests

Para:

```text
validation
conditional fields
calculation case validation
attachment validation
permission logic
```

## Integration tests

Para:

```text
authentication
submission creation
draft saving
section submission
reopening
file registration
authorization
```

## E2E

Flujo mínimo:

```text
login
→ create submission
→ section 1
→ section 2
→ section 3
→ create 3 cases
→ section 4
→ upload section 5 documents
→ complete
→ admin review
```

---

# 62. Criterios de aceptación funcional

El sistema se considera funcionalmente aceptable cuando:

### AC-01

Un usuario autenticado puede crear un levantamiento.

### AC-02

Puede guardar cualquier sección como borrador.

### AC-03

Puede abandonar el sistema y continuar posteriormente.

### AC-04

Las validaciones del navegador funcionan.

### AC-05

Las mismas validaciones se ejecutan en servidor.

### AC-06

Las condiciones `Otro` funcionan correctamente.

### AC-07

La sección 3 no puede enviarse con menos de tres casos.

### AC-08

Los casos de cálculo pueden agregarse y eliminarse.

### AC-09

Los archivos de hasta 20 MB pueden cargarse.

### AC-10

Los archivos no quedan públicamente accesibles.

### AC-11

Un usuario no puede descargar archivos de otro submission.

### AC-12

Un RESPONDENT no puede entrar al panel administrativo.

### AC-13

ADMIN puede reabrir una sección.

### AC-14

Todas las acciones críticas quedan auditadas.

### AC-15

La aplicación funciona correctamente en desktop y móvil.

### AC-16

No existe `middleware.ts`.

### AC-17

El despliegue funciona sobre Vercel.

### AC-18

La base de datos funciona sobre Neon.

### AC-19

Prisma funciona con el adapter correspondiente a PostgreSQL/Neon.

### AC-20

No existen secretos expuestos al cliente.

---

# 63. Criterios de calidad del código

El agente debe rechazar su propia implementación si encuentra:

* `any` innecesarios;
* queries Prisma dentro de componentes;
* validación únicamente en cliente;
* archivos almacenados dentro de PostgreSQL;
* URLs públicas para documentos sensibles;
* tokens de sesión en `localStorage`;
* autenticación basada únicamente en `proxy.ts`;
* lógica condicional duplicada;
* campos del formulario sin esquema de validación;
* migraciones destructivas;
* secretos hardcodeados;
* lógica crítica duplicada entre Route Handlers y Server Actions.

---

# 64. Estructura de proyecto sugerida

```text
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   └── login/
│   │
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── submissions/
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── section/
│   │   │           └── [section]/
│   │
│   ├── admin/
│   │   ├── users/
│   │   ├── submissions/
│   │   └── audit/
│   │
│   └── api/
│       ├── auth/
│       ├── uploads/
│       └── files/
│
├── components/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── domain/
│   ├── validation/
│   ├── storage/
│   └── audit/
│
├── actions/
├── types/
└── proxy.ts

prisma/
├── schema.prisma
└── migrations/

prisma7.config.ts
```

La estructura puede adaptarse a `app/` en raíz en lugar de `src/app/`, pero debe mantenerse una única convención consistente.

---

# 65. Definition of Done

El trabajo no debe considerarse terminado hasta cumplir todos estos puntos:

```text
[ ] Proyecto Next.js 16 configurado
[ ] React 19 configurado
[ ] TypeScript strict
[ ] Tailwind CSS 4
[ ] App Router
[ ] proxy.ts
[ ] Prisma 7
[ ] Neon PostgreSQL
[ ] Prisma adapter para Neon
[ ] Prisma migrations
[ ] Sesiones httpOnly
[ ] Login
[ ] Logout
[ ] Roles
[ ] Dashboard
[ ] Submission
[ ] Sección 1
[ ] Sección 2
[ ] Sección 3
[ ] Casos repetibles
[ ] Sección 4
[ ] Sección 5
[ ] Autosave/draft
[ ] Validación server-side
[ ] Vercel Blob privado
[ ] Upload de archivos
[ ] Descarga autorizada
[ ] Auditoría
[ ] Tests unitarios
[ ] Tests integración
[ ] Test E2E
[ ] Responsive
[ ] Accesibilidad
[ ] Build production
[ ] Migraciones verificadas
[ ] Variables de entorno documentadas
[ ] README técnico
```

---

# 66. Entregables esperados del agente

El agente debe entregar:

1. Aplicación funcional.
2. Esquema Prisma.
3. Migraciones.
4. Seed inicial controlado.
5. Autenticación.
6. Formularios completos.
7. Persistencia de borradores.
8. Persistencia de submissions.
9. Casos de cálculo.
10. Upload privado.
11. Descarga autorizada.
12. Auditoría.
13. Dashboard administrativo.
14. Tests.
15. README.
16. `.env.example`.
17. Instrucciones de despliegue Vercel.
18. Instrucciones de configuración Neon.
19. Instrucciones de configuración Vercel Blob.

---

# 67. Variables esperadas en `.env.example`

```env
DATABASE_URL=
DIRECT_URL=

AUTH_SECRET=

BLOB_READ_WRITE_TOKEN=

APP_URL=

SESSION_COOKIE_NAME=__Host-session
SESSION_TTL_DAYS=7

INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=

UPLOADTHING_TOKEN=
UPLOADTHING_API=
NEXT_PUBLIC_SITE_URL=
```

Nunca colocar valores reales.

---

# 68. Secuencia de implementación recomendada

## Fase 1 — Foundation

* Next.js
* TypeScript
* Tailwind
* Prisma
* Neon
* estructura de proyecto
* env
* lint
* tests

## Fase 2 — Seguridad

* User
* Session
* login
* logout
* cookie
* auth helpers
* proxy
* autorización

## Fase 3 — Submission

* FormSubmission
* SectionSubmission
* dashboard
* navegación

## Fase 4 — Formulario

Implementar:

```text
1 → 2 → 3 → 4 → 5
```

## Fase 5 — Archivos

* Vercel Blob
* upload
* metadata
* download
* authorization

## Fase 6 — Administración

* submissions
* usuarios
* auditoría
* reopening

## Fase 7 — QA

* unit
* integration
* E2E
* accesibilidad
* responsive
* production build

---

# 69. Regla final para el agente

Antes de modificar arquitectura o requisitos funcionales:

1. Revisar este SPEC.
2. Identificar si el cambio contradice una regla existente.
3. Mantener compatibilidad con el modelo de datos.
4. Mantener validación server-side.
5. Mantener autorización server-side.
6. Mantener privacidad de documentos.
7. Documentar cualquier decisión arquitectónica no prevista.

No eliminar preguntas ni restricciones del levantamiento original para simplificar la implementación.

No convertir este sistema en un formulario genérico.

El objetivo es construir una **plataforma de levantamiento de requerimientos especializada**, estructurada y auditable para el futuro desarrollo del:

> **Sistema de Ajuste por inflación fiscal inicial y regulares**

Fin del SPEC.

