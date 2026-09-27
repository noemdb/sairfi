## Elevator Pitch (máx. 3 frases)

SAIRFI es un sistema web que automatiza el cálculo del ajuste inicial y los reajustes regulares por inflación fiscal conforme a la Ley de ISLR de Venezuela, dirigido a contadores, asesores tributarios y empresas que deben determinar correctamente su renta gravable. Reemplaza los cálculos manuales en hojas de cálculo y reduce errores, mejorando la trazabilidad desde los datos de origen hasta los reportes finales. La versión 1.0 recibe datos preparados externamente y se enfoca exclusivamente en el motor de cálculo fiscal, dejando para una versión 2.0 la gestión completa de libros de compras, ventas, IVA y retenciones.

***

## Problema

### ¿Quién lo sufre hoy?

- Contadores públicos y asesores tributarios que atienden a empresas sujetas al régimen de ajuste por inflación fiscal en Venezuela.
- Departamentos de contabilidad y finanzas de empresas que deben calcular anualmente el ajuste inicial y los reajustes regulares.
- Contribuyentes que necesitan soporte documental para la determinación de la renta gravable y la atención de auditorías del SENIAT.

### ¿Cómo lo resuelve hoy (sin esta app)?

- Hojas de cálculo Excel con fórmulas manuales para calcular factores, valores actualizados y ajustes por partida.
- Plantillas heredadas con referencias rotas (`#REF!`), encabezados antiguos y datos mezclados entre períodos.
- Cálculos repetitivos que se reconstruyen cada año sin trazabilidad completa de índices, reglas y versiones aplicadas.
- Información dispersa entre libros de compras, ventas, activos fijos, inventarios y balances contables.
- Validación manual de cada cálculo, con alto riesgo de errores de transcripción, redondeo o fórmula.

### ¿Por qué esa solución actual no alcanza?

- **Falta de trazabilidad:** No se puede rastrear fácilmente qué índice, regla o versión se usó para cada cálculo aprobado.
- **Errores manuales:** Las fórmulas de Excel son propensas a errores, especialmente cuando hay cientos de partidas.
- **Sin versionamiento:** Los índices o reglas modificadas alteran silenciosamente cálculos históricos.
- **Sin auditoría:** No hay registro de quién aprobó qué, cuándo ni con qué justificación.
- **Sin integración:** Los datos deben transcribirse manualmente desde sistemas contables o administrativos.
- **Sin control de estados:** No hay flujo formal de borrador, revisión, aprobación y cierre de períodos.
- **Riesgo tributario:** Un error en el cálculo puede generar declaraciones incorrectas, sanciones o recargos.

***

## Usuarios objetivo

| Rol / Perfil | Necesidad principal | Nivel técnico esperado |
|---|---|---|
| **Contador público** | Calcular correctamente el ajuste por inflación fiscal, generar reportes auditables y validar resultados antes de presentar declaraciones. | Intermedio: usa Excel, software contable y herramientas web. |
| **Asesor tributario** | Definir reglas fiscales, validar tratamientos y aprobar cierres de ejercicios con evidencia documental. | Intermedio: enfocado en normativa y criterio profesional. |
| **Analista contable** | Cargar datos, ejecutar cálculos preliminares, revisar observaciones y preparar reportes para aprobación. | Intermedio-avanzado: maneja Excel y sistemas administrativos. |
| **Administrador del sistema** | Gestionar empresas, usuarios, índices, parámetros y permisos. | Intermedio: configuración y administración de sistemas web. |
| **Auditor (consulta)** | Revisar historial de cálculos, índices aplicados, versiones de reglas y bitácora de cambios. | Básico-intermedio: consulta y exportación de información. |
| **Dueño o gerente de empresa** | Consultar reportes de resultados, efectos sobre el patrimonio y estado de los ejercicios fiscales. | Básico: visualización de reportes y exportaciones. |

***

## Propuesta de valor

SAIRFI automatiza los cálculos del ajuste inicial y los reajustes regulares, reduciendo errores manuales y mejorando la trazabilidad mediante:

- **Motor de cálculo versionado:** Cada cálculo guarda índices, reglas y versiones aplicadas, permitiendo reproducir resultados históricos.
- **Trazabilidad completa:** Cada partida puede rastrearse hasta su fecha de origen, documento de soporte, índice base, índice de cierre y factor aplicado.
- **Flujo formal de aprobación:** Estados de borrador, revisión, aprobación y cierre con bitácora de cambios.
- **Importación estructurada:** Carga de saldos y movimientos desde archivos Excel o CSV, reduciendo la transcripción manual.
- **Reportes auditables:** Generación de balances fiscales actualizados, hojas de trabajo detalladas y consolidados por cuenta y categoría.
- **Seguridad y auditoría:** Registro de usuarios, roles, permisos y eventos sensibles para cumplir con requisitos de control interno.
- **Arquitectura preparada para ampliación:** Diseño que permite incorporar en la versión 2.0 módulos de compras, ventas, IVA y retenciones sin reescribir el núcleo.

A diferencia de las hojas de cálculo actuales, SAIRFI no es una plantilla estática: es un sistema con reglas configurables, versionamiento, auditoría y flujos de trabajo formales.

***

## Alcance (Scope)

### Dentro del alcance (v1)

- Registro de empresas y ejercicios fiscales.
- Administración de índices de inflación (INPC) con control de versiones.
- Registro manual o importado de activos, pasivos y patrimonio no monetarios.
- Clasificación fiscal de partidas (monetarias, no monetarias, excluidas).
- Registro de movimientos del período (altas, bajas, depreciaciones, ventas, cancelaciones).
- Motor de cálculo de ajuste inicial.
- Motor de cálculo de reajuste regular.
- Generación de Balance General Fiscal Actualizado (inicial y de cierre).
- Hojas de trabajo detalladas por partida y consolidadas.
- Importación de datos desde archivos Excel o CSV estructurados.
- Exportación de resultados a Excel y PDF.
- Auditoría de cálculos, cambios y aprobaciones.
- Roles y permisos básicos (administrador, analista, contador, asesor, auditor).
- Bitácora de eventos y versionamiento de reglas.

### Fuera del alcance (v1) — explícitamente pospuesto

- Gestión completa de libros de compras.
- Gestión completa de libros de ventas.
- Cálculo y declaración mensual de IVA.
- Generación de comprobantes de retención de IVA.
- Generación de comprobantes de retención de ISLR.
- Integración automática con sistemas contables o administrativos externos.
- Facturación electrónica.
- Módulo de inventarios con cantidades y costos unitarios.
- Módulo de activos fijos con depreciación automática (se incluirá registro manual en v1).
- Conciliación fiscal automática entre contabilidad y ajuste por inflación.
- Presentación de declaraciones ante el SENIAT.
- Múltiples ejercicios abiertos simultáneamente con cálculos en paralelo (se prioriza un ejercicio activo por empresa).

***

## Métricas de éxito

El proyecto se considerará exitoso cuando:

- **Reducción del tiempo de cálculo:** El tiempo para ejecutar un ajuste inicial o regular se reduzca al menos un 50% respecto al proceso manual en Excel.
- **Cero errores de fórmula:** Los cálculos del sistema coincidan con casos de prueba validados por el contador responsable.
- **Trazabilidad completa:** El 100% de los cálculos aprobados puedan rastrearse hasta sus datos, índices y reglas de origen.
- **Adopción por usuarios:** Al menos 3 usuarios activos (contador, analista, asesor) utilicen el sistema semanalmente durante el primer mes de producción.
- **Cierre formal de ejercicios:** Al menos 2 ejercicios fiscales completos (ajuste inicial + reajuste regular) se ejecuten, revisen, aprueben y cierren en el sistema.
- **Satisfacción del contador:** El responsable tributario valide por escrito que los resultados del sistema son confiables para su uso en declaraciones.
- **Cero incidentes de seguridad:** No se registren accesos no autorizados, pérdida de datos o modificaciones no auditadas durante los primeros 3 meses.
- **Preparación para v2:** La arquitectura permita incorporar al menos un módulo de la versión 2.0 (compras, ventas o retenciones) sin reescribir el motor de cálculo.

***

## Contexto institucional / restricciones del entorno

- **Normativa aplicable:** Ley de Impuesto sobre la Renta (LISLR) de Venezuela, Título IX, artículos 173 al 193. Reglamento de la LISLR, artículos 170 al 181. Providencias y criterios del SENIAT.
- **Índices de inflación:** El sistema usará el Índice Nacional de Precios al Consumidor (INPC) como referencia, cargado manualmente o importado desde archivos estructurados. La fuente oficial debe ser validada por el responsable tributario.
- **Entorno tecnológico:** Sistema web accesible desde navegadores modernos (Chrome, Firefox, Edge). Stack Next.js 16 + React 19 + TypeScript sobre Vercel, PostgreSQL 18 en Neon.tech vía Prisma ORM, archivos privados en Vercel Blob (ver `ARCHITECTURE.md` y ADR-001 en `DECISIONS.md`).
- **Conectividad:** Se asume conexión a internet estable para acceso web. En caso de conectividad limitada, el sistema debe permitir exportaciones locales y trabajo asíncrono.
- **Seguridad de datos:** La información tributaria y patrimonial se considera sensible. Debe cifrarse en tránsito (HTTPS) y almacenarse con controles de acceso basados en roles.
- **Responsabilidad profesional:** El sistema no sustituye el criterio del contador público. Todos los resultados deben ser revisados y aprobados por un profesional calificado antes de usarse en declaraciones.
- **Idioma:** Interfaz y reportes en español. Formatos numéricos según convención venezolana (separador de miles: coma o punto según configuración; separador decimal: punto o coma según configuración).
- **Moneda:** Bolívares (Bs.) como moneda base. El sistema debe permitir configuración de precisión y redondeo.

***

## Referencias / productos similares analizados

| Producto | Qué hace bien | Qué le falta / por qué no sirve tal cual |
|---|---|---|
| **Hojas de cálculo Excel heredadas** | Flexibilidad, fórmulas personalizables, ampliamente conocidas por contadores. | Sin trazabilidad de versiones, propenso a errores de fórmula, sin auditoría, sin flujos de aprobación, difícil de escalar. |
| **Software contable genérico (A2, Aspel, CONTPAQi)** | Gestión integral de contabilidad, libros, reportes y declaraciones. | No siempre incluyen módulo específico de ajuste por inflación fiscal venezolano; cuando lo incluyen, puede ser rígido o no configurable. |
| **Plantillas de consultoras tributarias** | Basadas en experiencia profesional, incluyen casos de uso reales. | Suelen ser estáticas, sin versionamiento, dependientes de la persona que las creó, difíciles de auditar externamente. |
| **Sistemas tributarios en la nube (genéricos)** | Accesibilidad, actualizaciones automáticas, integración con declaraciones. | Pocos adaptados a la normativa venezolana de ajuste por inflación; costos elevados; dependencia de proveedores externos. |
| **Desarrollos a medida (casos locales)** | Adaptados al cliente, reglas específicas. | Documentación limitada, dependencia del desarrollador original, difícil mantenimiento, sin preparación para ampliaciones futuras. |
| **SAIRFI (este proyecto)** | Motor de cálculo fiscal especializado, trazabilidad completa, versionamiento, auditoría, preparado para ampliaciones. | Versión 1.0 no incluye gestión de libros completos ni integración automática con sistemas externos (se pospone para v2). |

***