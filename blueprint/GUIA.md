# Mi Proceso para Crear una App con IA — v2

## Introducción

La IA acelera el proceso, pero no puede hacerlo sola. El criterio de cada paso lo debes ir incorporando tú mismo. No abras la IA y empieces a pedir código sin más. Este es el proceso que debes copiar.

**Qué cambia en esta versión:** la v1 describía bien el *flujo de trabajo* (problema → arquitectura → bloques → pruebas → seguridad → auditoría), pero todo el conocimiento generado en el camino vivía en el historial de chat con la IA — se perdía, se repetía, o el agente de turno no tenía cómo recuperarlo. La v2 agrega una capa de **documentación viva**: un set de 9 archivos que capturan cada decisión a medida que se toma, para que cualquier agente de IA (Cursor, Claude Code, Codex) pueda retomar el proyecto sin que tengas que volver a explicarle todo desde cero.

Estos 9 archivos no son burocracia — son la memoria persistente del proyecto:

| Archivo | Responde a | Se llena en el paso |
|---|---|---|
| `PROJECT.md` | ¿Qué estamos construyendo y para quién? | 01 |
| `ARCHITECTURE.md` | ¿Cómo están conectadas las piezas? | 02 |
| `DOMAIN.md` | ¿Cuáles son las reglas del negocio? | 02 |
| `DATABASE.md` | ¿Cómo se modelan y persisten los datos? | 02 → se refina en 03 |
| `API.md` | ¿Qué expone el sistema y cómo se consume? | 03 (por bloque) |
| `SECURITY.md` | ¿Qué protege al sistema y a sus usuarios? | 05 |
| `CONVENTIONS.md` | ¿Cómo se escribe el código aquí? | 02 → se refina en 06 |
| `DECISIONS.md` | ¿Por qué se decidió esto y no otra cosa? | Continuo (ADRs) |
| `TODO.md` | ¿En qué estado está cada pieza ahora mismo? | Continuo |

Regla de oro de la v2: **si una decisión no está en uno de estos archivos, no existe** para efectos de que un agente de IA la tenga en cuenta más adelante.

---

## 00. Preparo el esqueleto de documentación

Antes del primer prompt de código, creo los 9 archivos vacíos con su estructura de secciones (ver plantillas). No hace falta llenarlos todavía — solo que existan, para que cada paso posterior sepa dónde escribir.

- **Acción:** copio las 9 plantillas a la raíz del repo (o a `/docs`).
- **Por qué primero:** si el esqueleto no existe antes de empezar, en la práctica nunca se crea — queda "para después" y el después no llega.

## 01. Defino el problema → `PROJECT.md`

Antes de escribir una sola línea de código o pedirle algo a la IA, debes tener claridad absoluta.

- **Investigación:** Analiza productos similares. ¿Qué hace la app? ¿Para quién es? ¿Qué problema resuelve exactamente?
- **Regla de oro:** Si no puedes explicarlo en 3 frases, todavía no está claro.
- **Enfoque:** Define el qué, el para quién y el por qué.
- **Nuevo en v2:** todo esto se escribe directamente en `PROJECT.md`, no se queda en tu cabeza ni en un chat que vas a cerrar. Ese archivo es el primer contexto que le pasas a cualquier agente de IA en cualquier sesión nueva.

## 02. Pido la estructura general, no el código → `ARCHITECTURE.md`, `DOMAIN.md`, `DATABASE.md` (v1), `CONVENTIONS.md` (v1)

No empieces pidiendo código. Primero, la arquitectura.

- **Acción:** Pídele a la IA que proponga la arquitectura y diseño: qué partes necesita el proyecto y cómo se conectan.
- **Revisión:** Revisa que tenga sentido antes de escribir una sola línea de código.
- **Componentes clave a definir:** Frontend, Auth (Autenticación), API, Database (Base de datos) y UI/UX.
- **Nuevo en v2:** en esta misma conversación con la IA le pido, además de la arquitectura, tres cosas más que suelen quedar implícitas y luego se olvidan:
  1. El **glosario de dominio** y las reglas de negocio principales → van a `DOMAIN.md`.
  2. Un **borrador de esquema de datos** (entidades, relaciones, y si trabajas con Zod, los schemas iniciales) → va a `DATABASE.md`.
  3. Las **convenciones de código** que va a seguir el proyecto (estructura de carpetas, naming, estilo) → van a `CONVENTIONS.md`.
- Toda decisión de arquitectura que tenga alternativas descartadas (ej. "REST vs. tRPC", "Zustand vs. Context") se anota como ADR en `DECISIONS.md` en el momento, con el motivo de la elección — no después de memoria.

## 03. Construyo por bloques pequeños → `API.md`, `TODO.md`

Evita la parálisis por análisis o los errores masivos.

- **Estrategia:** Una función, un componente, un endpoint a la vez.
- **Regla de oro:** Nunca pidas "la app completa" de una sola vez. La IA cometerá errores si le das demasiada carga.
- **Nuevo en v2:**
  - Antes de construir, el bloque entra a `TODO.md` con sus criterios de aceptación (qué significa "terminado" para ese bloque específico).
  - Si el bloque expone o consume un endpoint, se documenta en `API.md` en el mismo momento en que se construye — request/response, schema de validación, requisitos de autenticación — no al final del proyecto cuando ya nadie recuerda los detalles.

## 04. Pruebo cada bloque antes de seguir → `TODO.md`

No acumules deuda técnica.

- **Checklist de validación:**
  - Reviso que funcione ✅
  - Que maneje errores ✅
  - Que tenga tests y validaciones ✅
  - Que tenga sentido lógico ✅
- **Advertencia:** Avanzar sobre algo que no probé es acumular problemas para después.
- **Nuevo en v2:** el bloque solo se marca como completado en `TODO.md` cuando pasa el checklist completo. Un bloque "a medias" se queda visiblemente como en progreso — nunca se marca terminado "para no perder el hilo".

## 05. Reviso seguridad antes de conectar nada sensible → `SECURITY.md`

La seguridad no es opcional.

- **Puntos clave:**
  - API keys en variables de entorno.
  - Validación de inputs.
  - Rate limiting.
- **Regla de oro:** Esto no se negocia, sin importar qué tan simple sea el proyecto.
- **Nuevo en v2:** además de los tres puntos clave, `SECURITY.md` mantiene actualizada la **matriz RBAC** (qué rol puede hacer qué, sobre qué recurso) desde el momento en que aparece el primer control de acceso, no cuando ya hay diez roles y es tarde para documentarlos con precisión.

## 06. Le pido a la IA que audite lo que construimos juntos → `DECISIONS.md`, `CONVENTIONS.md`

La IA es excelente revisando su propio trabajo (o el tuyo) desde otra perspectiva.

- **Prompt sugerido:** "Revisa todo el código y dime qué mejorarías o qué riesgos ves."
- **Beneficio:** Una segunda revisión siempre encuentra algo que se pasó por alto.
- **Nuevo en v2:** cada hallazgo de la auditoría se resuelve de una de dos formas, y ambas quedan escritas:
  1. Si implica un cambio de rumbo → nuevo ADR en `DECISIONS.md` explicando qué se encontró y qué se decidió hacer.
  2. Si implica una regla de estilo o consistencia → se añade o ajusta en `CONVENTIONS.md` para que no se repita en el siguiente bloque.

## 07. Mantengo la documentación viva (nuevo)

Este paso no es un evento único, corre en paralelo a todos los anteriores.

- **Al iniciar cada sesión nueva con un agente de IA:** le paso `PROJECT.md` + `ARCHITECTURE.md` + `TODO.md` como contexto mínimo. Si el trabajo toca dominio, seguridad o API, sumo el archivo correspondiente.
- **Al cerrar cada sesión:** actualizo `TODO.md` con el estado real (no el ideal) y reviso si algo de lo conversado merece un ADR en `DECISIONS.md`.
- **Señal de alerta:** si notas que le estás re-explicando a la IA algo que ya decidiste hace dos semanas, es que ese algo no quedó escrito donde debía. Corrígelo ahí mismo, no lo dejes pasar otra vez.

---

## Cómo usar esto en la práctica

1. Copia las 9 plantillas a un proyecto nuevo (paso 00).
2. Sigue los pasos 01 a 06 en orden para la primera versión del proyecto.
3. A partir de ahí, el ciclo 03 → 04 → 07 se repite por cada nueva funcionalidad; 05 y 06 se repiten en cada release o cuando se toca algo sensible.
4. `DECISIONS.md` y `TODO.md` nunca se dan por "terminados" — son los dos archivos que más vida útil tienen durante todo el proyecto.
