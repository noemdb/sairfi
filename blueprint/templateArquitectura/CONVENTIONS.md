# CONVENTIONS.md — {{Nombre del Proyecto}}

> Se llena en el Paso 02 con lo básico y se refina en el Paso 06 tras cada auditoría. Es el archivo que le da consistencia al código sin importar qué agente de IA lo escriba.

## Estructura de carpetas
```
{{describir árbol de carpetas real del proyecto}}
```

## Convenciones de nombres
| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | | |
| Archivos | | |
| Variables/funciones | | |
| Tablas/columnas DB | *(ver también DATABASE.md)* | |
| Rutas de API | *(ver también API.md)* | |

## Estilo de código
- **Formateador / linter:** {{Prettier, ESLint, Pint...}}
- **Reglas propias que no cubre el linter por defecto:**
  -

## Patrones preferidos
{{Ej: Server Actions tipadas en vez de fetch manual, composición sobre herencia, hooks personalizados para lógica repetida.}}

## Patrones a evitar
{{Ej: lógica de negocio en componentes de UI, queries directas en el frontend, servicios Python separados si la lógica cabe en el stack de Next.js.}}

## Convenciones de commits / control de versiones
- **Formato de mensajes:** {{Conventional Commits u otro}}
- **Estrategia de ramas:**

## Convenciones de testing
- **Framework:**
- **Qué se testea obligatoriamente:** {{lógica de negocio, endpoints críticos, validaciones}}
- **Qué no se testea (y por qué):**

## Hallazgos de auditorías (histórico)
| Fecha | Hallazgo | Convención resultante |
|---|---|---|
| | | |
