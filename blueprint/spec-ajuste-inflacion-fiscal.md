# Especificación Maestra (Spec-Driven) — Sistema de Ajuste por Inflación Fiscal
## Ajuste Inicial y Reajuste Regular · Nivel Staff Engineer

> **Documento único de referencia para un agente orquestador de IA.**
> Contiene lógica de negocio, modelo de dominio, arquitectura técnica, contratos de datos, reglas de validación, plan de ejecución y casos de aceptación. Está escrito para ser consumido por un agente de codificación autónomo (o una cadena de agentes especializados) que generará el código fuente del sistema.

---

## 0. Cómo debe usar este documento el agente orquestador

1. Este documento es la **única fuente de verdad funcional y técnica** para el sistema. Ningún agente debe inventar reglas tributarias, fórmulas o clasificaciones fiscales que no estén aquí. Donde el documento diga "configurable" o "definido por el responsable tributario", el agente debe **construir el mecanismo de configuración**, no decidir el valor.
2. El documento está dividido en dos capas que deben mantenerse desacopladas en el código:
   - **Capa de negocio** (secciones 1–20): reglas, entidades, procesos, validaciones. Es agnóstica de framework.
   - **Capa técnica** (secciones 21–34): cómo se implementa esa capa de negocio con el stack obligatorio.
3. Orden de ejecución sugerido para el agente orquestador (ver también sección 33 "Plan de ejecución"):
   `Modelo de datos → Autenticación y sesiones → Módulo de empresas/usuarios/roles → Catálogo de cuentas → Índices → Partidas y movimientos → Motor de cálculo (ajuste inicial) → Motor de cálculo (reajuste regular) → Flujo de revisión/aprobación/cierre → Auditoría → Reportes/exportación → Importación de datos → Endurecimiento de seguridad → Pruebas de aceptación`.
4. Cualquier ambigüedad no resuelta en este documento debe registrarse como un `TODO(tributario):` en el código y en un archivo `docs/decisiones-pendientes.md`, nunca resolverse por defecto silenciosamente.
5. Este sistema **no sustituye el criterio de un contador público ni de un asesor tributario**. El agente no debe codificar valores de índices, porcentajes o interpretaciones legales; solo el mecanismo para que un humano los cargue, versiones y apruebe.

---

# PARTE A — LÓGICA DE NEGOCIO

## 1. Propósito del sistema

Apoyar el cálculo del ajuste fiscal por inflación de una o varias empresas, manteniendo trazabilidad completa desde los saldos y movimientos de origen hasta los resultados fiscales y reportes finales por ejercicio.

Procesos principales:

1. **Ajuste inicial por inflación.**
2. **Reajuste regular por inflación.**

Resultado esperado: información fiscal actualizada, verificable, exportable y respaldada documentalmente, como soporte para la determinación de la renta gravable, papeles de trabajo, revisión profesional, auditorías y declaraciones tributarias.

El sistema **no** sustituye un software contable general ni presenta declaraciones ante el SENIAT, salvo módulo adicional explícitamente aprobado.

## 2. Objetivos de negocio

- Centralizar la información necesaria para los cálculos de ajuste por inflación fiscal.
- Reducir errores de cálculo manual en hojas de cálculo.
- Mantener base histórica y fiscal actualizada de cada partida.
- Diferenciar valores históricos, valores fiscales actualizados y resultados de cada proceso.
- Aplicar índices de inflación por período con origen, fecha de carga y responsable de aprobación.
- Generar resultados reproducibles (mismos datos + reglas + índices ⇒ mismo resultado).
- Conservar trazabilidad de factores, fórmulas, movimientos y criterios.
- Permitir revisión, observación, aprobación y cierre formal de cada ejercicio.
- Generar reportes de soporte para contador, asesor tributario, auditor o cliente.
- Atender varias empresas sin mezclar información, saldos, usuarios ni períodos (multi-tenant).
- Mantener parametrizables las reglas cuya aplicación varíe por criterio tributario, fecha, tipo de contribuyente o interpretación profesional.

## 3. Principios rectores

### 3.1 Fiscal, no contable general
Puede tomar datos desde contabilidad financiera, pero los resultados se almacenan en una capa fiscal independiente. Nunca sobrescribir silenciosamente valores contables originales. Distinguir siempre: valor contable/histórico, valor fiscal base, valor fiscal actualizado, ajuste acumulado de períodos anteriores, ajuste del período actual, resultado del reajuste regular, regla/índice/factor aplicados.

### 3.2 Trazabilidad antes que automatización opaca
Todo monto calculado debe poder explicarse mediante: empresa y ejercicio, partida/cuenta de origen, documento de soporte, fecha relevante, clasificación fiscal, índice base, índice de cierre, factor, fórmula, usuario/fecha/versión de reglas.

### 3.3 Datos cerrados inmutables
Un cálculo aprobado o período cerrado queda protegido contra modificación directa. Corrección solo vía: reapertura autorizada, ajuste de corrección, nueva versión de cálculo, con motivo/usuario/fecha/aprobación registrados y conservación de la versión anterior.

### 3.4 Reglas configurables y versionadas
No codificar rígidamente reglas tributarias variables. Parametrizable como mínimo: tipo/fuente de índice, vigencia del índice, fórmula del factor, reglas de redondeo, clasificación de cuentas, tratamiento de activos/pasivos/patrimonio, tratamiento de altas/bajas/ventas/retiros/cancelaciones, tratamiento de depreciación/amortización, formatos de reporte, cuentas excluidas, reglas de RAR, criterios por cliente/empresa.

## 4. Alcance funcional (módulos)

1. Administración de empresas.
2. Administración de ejercicios fiscales.
3. Administración de usuarios, roles y permisos.
4. Catálogo de cuentas y clasificación fiscal.
5. Registro e importación de saldos y movimientos.
6. Catálogo y carga de índices de precios.
7. Ajuste inicial por inflación.
8. Reajuste regular por inflación.
9. Gestión de activos y pasivos no monetarios.
10. Gestión de movimientos patrimoniales (si aplica).
11. Gestión de documentos de respaldo.
12. Revisión, aprobación y cierre de períodos.
13. Reportes, exportaciones y papeles de trabajo.
14. Auditoría y bitácora de operaciones.
15. Configuración de reglas y versiones de cálculo.

## 5. Glosario del dominio

| Concepto | Definición |
|---|---|
| Empresa | Entidad/contribuyente sobre la cual se calculan los ajustes |
| Ejercicio fiscal | Período tributario de una empresa (inicio–cierre) |
| Partida | Registro fiscal de un activo, pasivo, componente patrimonial o movimiento |
| Cuenta contable | Código/nombre del plan de cuentas del cliente |
| Clasificación fiscal | Monetaria / no monetaria / excluida / patrimonio / otra |
| Valor histórico | Valor original al momento de adquisición/incorporación |
| Valor fiscal base | Punto de partida del ajuste de un período |
| Valor fiscal actualizado | Resultado de aplicar el factor de ajuste |
| Ajuste | Diferencia entre valor actualizado y valor fiscal base |
| Índice (INPC u otro) | Índice de precios definido como fuente aplicable |
| Factor de actualización | Índice de cierre ÷ índice base |
| Ajuste inicial | Actualización extraordinaria que fija el Balance Fiscal Actualizado inicial |
| Reajuste regular | Actualización al cierre de ejercicios posteriores al ajuste inicial |
| RAR | Registro de Activos Actualizados (si aplica) |
| Movimiento | Evento que altera una partida (adquisición, baja, venta, pago, etc.) |
| Cierre fiscal | Estado que bloquea modificaciones ordinarias de un ejercicio |
| Caso de aceptación | Escenario validado por el asesor tributario para probar el motor |

## 6. Entidades principales (definición funcional)

### 6.1 Empresa
Identificador interno, razón social, RIF (único), dirección fiscal, actividad económica, fecha de inicio de operaciones, fecha habitual de cierre, condición tributaria, estado (activa/inactiva/archivada), responsable contable, responsable tributario, parámetros fiscales, zona horaria, moneda base, política de redondeo.

### 6.2 Ejercicio fiscal
Empresa asociada, fecha inicio, fecha cierre, año/identificador, estado, fechas de creación/cálculo/revisión/aprobación/cierre, usuario responsable por etapa, versión de reglas aplicada, versión de índices aplicada, observaciones.

Estados: `BORRADOR, EN_PREPARACION, PENDIENTE_DE_REVISION, OBSERVADO, APROBADO, CERRADO, REABIERTO, ANULADO`.

### 6.3 Cuenta contable y clasificación fiscal
Código, nombre, naturaleza contable (activo/pasivo/patrimonio/ingreso/costo/gasto/orden/otra), clasificación fiscal, indicador monetaria/no monetaria, indicador de elegibilidad para ajuste, categoría fiscal, cuenta de contrapartida, vigencia, estado, observación/fundamento, responsable que aprobó.

Categorías fiscales: `ACTIVO_NO_MONETARIO, PASIVO_NO_MONETARIO, PARTIDA_MONETARIA, PATRIMONIO, INVENTARIO, PROPIEDAD_PLANTA_EQUIPO, INTANGIBLE, INVERSION_PERMANENTE, CONSTRUCCION_EN_PROCESO, DEUDA_LARGO_PLAZO, DEPRECIACION_ACUMULADA, AMORTIZACION_ACUMULADA, PARTIDA_EXCLUIDA, REQUIERE_REVISION`.

### 6.4 Índice de precios
Tipo, fuente, período (año/mes), valor, fecha de publicación, fecha de registro, medio de carga (manual/importación/integración), archivo de soporte, usuario que cargó/aprobó, estado (`BORRADOR, APROBADO, REEMPLAZADO, ANULADO`), observación, versión.

Un cálculo aprobado **nunca** cambia automáticamente porque se modifique un índice; requiere nueva versión de cálculo o reapertura formal.

### 6.5 Partida fiscal ajustable
Empresa, ejercicio de incorporación, cuenta contable, clasificación fiscal, tipo (activo/pasivo/patrimonio), naturaleza monetaria/no monetaria, descripción, referencia documental, documento de respaldo, fecha de adquisición/incorporación, fecha de última actualización fiscal, fecha de baja/venta, valor histórico, valor fiscal base, ajuste acumulado, valor fiscal actualizado, vida útil, método de depreciación/amortización, saldo de depreciación/amortización acumulada, estado (`activo, vendido, dado_de_baja, cancelado, suspendido, en_revision`), regla aplicada, observaciones.

## 7. Clasificación de partidas

La clasificación fiscal es obligatoria antes de calcular; una partida sin clasificación aprobada **no** puede entrar automáticamente a un cálculo definitivo. La clasificación se decide por cuenta, subcuenta o partida individual (nunca solo por el nombre), respaldada por el responsable tributario.

- **Monetarias** (ejemplos a evaluar): caja, bancos, cuentas por cobrar/pagar, préstamos, bonos, efectivo equivalente, anticipos, obligaciones contractuales.
- **No monetarias** (ejemplos a evaluar): inventarios, mercancías en tránsito, inmuebles, terrenos, edificios, vehículos, maquinaria, equipos, mobiliario, construcciones en proceso, intangibles, inversiones permanentes, ciertas obligaciones no monetarias, componentes de patrimonio.
- **Excluidas / en revisión**: `EXCLUIDA, PENDIENTE_DE_CLASIFICACION, PENDIENTE_DE_SOPORTE, PENDIENTE_DE_REVISION_TRIBUTARIA, NO_APLICA_POR_REGLA_DE_EMPRESA`. Una partida pendiente de revisión no entra a un cálculo final sin acción explícita de aprobación o exclusión.

## 8. Lógica del ajuste inicial

**Finalidad:** construir el **Balance General Fiscal Actualizado Inicial**, referencia para ejercicios posteriores.

**Condiciones previas:** empresa activa; ejercicio fiscal abierto con fecha de cierre definida; plan de cuentas cargado; partidas con clasificación fiscal aprobada; índices necesarios cargados y aprobados; fecha/valor de origen verificables por partida; soportes adjuntos o marcados pendientes; reglas fiscales seleccionadas y versionadas; responsable tributario/aprobador asignado.

**Regla general configurable** (por partida no monetaria):

```
Factor de actualización = Índice de cierre / Índice base
Valor actualizado        = Valor fiscal base × Factor de actualización
Ajuste                   = Valor actualizado − Valor fiscal base
```

**Proceso funcional:**
1. Crear proceso de ajuste inicial (empresa + ejercicio).
2. Congelar copia de índices, reglas y saldos usados.
3. Obtener partidas elegibles clasificadas.
4. Validar fecha/valor/soporte suficiente por partida.
5. Determinar índice base por partida.
6. Determinar índice de cierre del ejercicio.
7. Calcular factor de actualización.
8. Calcular valor actualizado.
9. Determinar ajuste individual.
10. Consolidar por tipo, cuenta y categoría fiscal.
11. Determinar efecto neto sobre patrimonio fiscal.
12. Generar Balance General Fiscal Actualizado Inicial.
13. Generar hoja de trabajo detallada.
14. Marcar cálculo como pendiente de revisión.
15. Permitir observaciones/correcciones/recálculo.
16. Aprobar cálculo.
17. Cerrar/bloquear resultado aprobado.
18. Usar el cierre aprobado como base del primer reajuste regular.

**Resultado mínimo:** partidas procesadas/excluidas/observadas con motivo, índices y factores aplicados, valor base/actualizado y ajuste por partida, ajuste por cuenta y por categoría, Balance Fiscal Actualizado Inicial, variación de patrimonio fiscal, soportes faltantes, bitácora, versión de reglas/índices, exportación (Excel/PDF si aplica).

**Registro de Activos Actualizados (RAR)** — submódulo configurable, cuando el responsable tributario lo requiera: activos incluidos, valores antes/después, referencia de inscripción, pagos/comprobantes si corresponde, listados, documentos asociados. Separar siempre el cálculo del ajuste de cualquier determinación de pago o deber formal adicional. Su aplicabilidad es configurable por empresa, no asumida.

## 9. Lógica del reajuste regular

**Finalidad:** actualizar, al cierre de cada ejercicio posterior, los valores fiscales del ejercicio anterior y los movimientos del período. Forma parte de la determinación fiscal anual.

**Punto de partida:** Balance Fiscal Actualizado aprobado del ejercicio anterior + saldos actualizados existentes + movimientos del ejercicio + índices aplicables + reglas vigentes. **Nunca** partir de un cálculo anterior en estado borrador, observado o anulado; el ejercicio anterior debe estar cerrado/aprobado.

**Tipos de movimiento:** `ADQUISICION, INCORPORACION, MEJORA, CAPITALIZACION, TRANSFERENCIA, RECLASIFICACION, DEPRECIACION, AMORTIZACION, VENTA, RETIRO, BAJA, SINIESTRO, CANCELACION_DE_PASIVO, NUEVA_OBLIGACION, PAGO_PARCIAL, APORTE_DE_CAPITAL, AUMENTO_DE_CAPITAL, REDUCCION_DE_CAPITAL, DIVIDENDO, DISTRIBUCION_DE_UTILIDADES, CORRECCION`.

Cada movimiento registra: fecha efectiva, valor, documento de respaldo, cuenta origen/destino, tratamiento fiscal, índice base, estado de aprobación, observación, usuario responsable.

**Saldos existentes al inicio del ejercicio:**

```
Factor del período           = Índice de cierre actual / Índice de cierre anterior
Valor actualizado al cierre  = Valor fiscal actualizado anterior × Factor del período
Reajuste del período          = Valor actualizado al cierre − Valor fiscal actualizado anterior
```

Ejemplo: 600.000 × (450/300) = 900.000 ⇒ reajuste = 300.000.

**Movimientos del período** (no se tratan como existentes desde el inicio):

```
Factor del movimiento          = Índice de cierre actual / Índice aplicable a la fecha del movimiento
Valor actualizado del movimiento = Valor del movimiento × Factor del movimiento
```

El responsable tributario debe definir por escrito el criterio de índice base del movimiento (mes del movimiento, mes anterior, promedio, fecha de incorporación, u otro). El sistema **no** debe asumir un criterio por defecto.

**Activos no monetarios:** considerar saldo inicial, adquisiciones, mejoras/adiciones, depreciación/amortización, reclasificaciones, bajas/ventas/retiros, pérdidas/siniestros, saldo final, ajuste acumulado, reajuste del período. El tratamiento exacto de depreciables (costo histórico/fiscal, depreciación histórica/fiscal/acumulada, vida útil, método, valor residual, fecha de puesta en uso, baja/venta) debe ser configurable y validado por el contador responsable.

**Pasivos no monetarios:** saldo base, fecha de origen/último ajuste, incrementos, pagos parciales, refinanciamientos, cancelaciones, reclasificaciones, saldo pendiente al cierre, factor, reajuste del período. **Nunca** inferir "no monetario" solo por ser de largo plazo; la clasificación siempre la valida el asesor tributario.

**Patrimonio (si el alcance lo incluye):** capital social, aportes de socios, prima en emisión, reservas, resultados acumulados/del ejercicio, dividendos, aumentos/reducciones de capital, reclasificaciones patrimoniales, ajustes de ejercicios anteriores. Cada movimiento patrimonial registra fecha, soporte, tipo, monto, cuenta, índice base, tratamiento fiscal aprobado.

**Resultado neto del reajuste** (representación simplificada, configurable en presentación):

```
Resultado neto de reajuste = Reajustes de activos y patrimonio − Reajustes de pasivos
```

Reporte mínimo: reajuste de activos/pasivos/patrimonio, por categoría, excluidos, efecto neto, tratamiento propuesto para conciliación fiscal, observaciones/advertencias.

**Resultado del proceso:** Balance Fiscal Actualizado de cierre, hoja de trabajo por partida, movimiento de saldos inicio→cierre, detalle de altas/bajas/ventas/pagos/reclasificaciones, factores e índices aplicados, resultado neto, resumen de conciliación fiscal, partidas pendientes, documentos faltantes, versión de cálculo/reglas, archivo de auditoría, exportaciones aprobadas.

## 10. Flujo operativo y estados

**Flujo por período:**
```
1. Crear ejercicio fiscal
2. Cargar/importar información
3. Clasificar partidas
4. Cargar y aprobar índices
5. Validar datos y soportes
6. Ejecutar cálculo preliminar
7. Revisar diferencias y observaciones
8. Corregir o complementar datos
9. Ejecutar cálculo definitivo
10. Enviar a aprobación tributaria
11. Aprobar resultado
12. Generar reportes finales
13. Cerrar período
14. Conservar historial y evidencias
```

**Estado de una partida:** `BORRADOR, PENDIENTE_DE_SOPORTE, PENDIENTE_DE_CLASIFICACION, PENDIENTE_DE_REVISION, VALIDADA, INCLUIDA_EN_CALCULO, EXCLUIDA, VENDIDA, DADA_DE_BAJA, CANCELADA, BLOQUEADA_POR_CIERRE`.

**Estado de un cálculo:** `NO_INICIADO, EN_PROCESO, CALCULADO_PRELIMINAR, CON_OBSERVACIONES, PENDIENTE_DE_APROBACION, APROBADO, CERRADO, REABIERTO, ANULADO`.

**Reglas de transición:**
- No se aprueba un cálculo con partidas obligatorias sin clasificación, índices faltantes, o movimientos sin fecha/valor.
- Un período cerrado no se edita sin reapertura autorizada (motivo, usuario autorizador, fecha, alcance registrados).
- Toda nueva ejecución tras corrección conserva la versión anterior.
- Toda exportación final indica versión de cálculo, fecha de generación y estado del período.

## 11. Validaciones obligatorias

**Empresa/período:** RIF único por empresa; fecha de cierre posterior a fecha de inicio; no dos ejercicios activos con las mismas fechas para la misma empresa; no ejecutar reajuste regular sin ajuste inicial o ejercicio anterior aprobado (salvo excepción documentada por el responsable tributario); el ejercicio anterior debe estar cerrado/aprobado.

**Índices:** no más de un índice aprobado del mismo tipo/fuente/período sin versionamiento explícito; valor numérico > 0; fuente identificada; índices usados en cálculos aprobados no se eliminan; reemplazo exige justificación y registro de impacto potencial; deben existir todos los períodos de índice necesarios antes de calcular.

**Partidas:** toda partida incluida requiere cuenta, clasificación fiscal, fecha base, valor fiscal base, índice base e índice de cierre disponibles; un activo vendido/dado de baja no puede figurar como saldo activo de cierre; un pasivo cancelado no puede figurar como saldo pendiente; un movimiento no debe exceder el saldo disponible cuando la operación lo impida; la depreciación acumulada no debe superar el límite de la política aprobada; correcciones manuales requieren justificación y aprobación.

**Integridad aritmética:** todo factor debe ser recalculable desde los índices guardados; todo valor actualizado debe ser recalculable desde base+factor; totales de reporte deben coincidir con el detalle; ajustes por cuenta deben cuadrar con ajustes por categoría; el balance fiscal conserva sus relaciones de comprobación; toda diferencia entre importación y total procesado debe quedar identificada.

## 12. Cálculos y redondeo

Política de redondeo configurable por empresa y versión de reglas. Almacenar siempre: valor sin redondeo (precisión extendida), regla de redondeo aplicada, valor presentado, precisión de índices/factores/montos.

```
Precisión de índices:            5–8 decimales
Precisión de factores:           8 decimales
Precisión interna de cálculo:    8–12 decimales
Presentación monetaria:          2 decimales
Regla de redondeo:               configurable
```

Calcular siempre con precisión interna; redondear preferiblemente al presentar/consolidar, nunca de forma temprana (para evitar diferencias materiales acumuladas).

## 13. Importación e integración de datos

**Principios:** controlada, reversible, trazable. Cada archivo importado conserva: nombre, tipo, fecha de carga, usuario, empresa/ejercicio objetivo, plantilla usada, filas totales/válidas/rechazadas, errores por fila, hash/identificador de integridad, estado de importación, archivo original descargable.

**Fuentes soportadas:** registro manual, Excel, CSV, exportación de software administrativo/contable, API externa, plantillas prediseñadas, carga masiva de saldos/movimientos/índices.

**No sobrescritura:** una importación nunca sobrescribe datos aprobados/cerrados sin proceso de corrección autorizado. Al importar una nueva versión: detectar registros nuevos/modificados/eliminados en el origen, mostrar diferencias, solicitar confirmación, crear versión/lote de importación, preservar el lote anterior, exigir recálculo si los datos modifican resultados.

## 14. Revisión, aprobación y control interno

**Roles:** Administrador del sistema, Operador/Analista, Contador, Asesor tributario, Supervisor, Auditor/Consulta, Cliente final (ver sección 22 para el mapeo a RBAC técnico).

**Separación de funciones:** quien carga índices no necesariamente los aprueba; quien registra saldos no necesariamente aprueba el cálculo; quien ejecuta un cálculo no necesariamente lo cierra; quien reabre un período no necesariamente modifica las partidas; quien consulta reportes no necesariamente descarga información sensible de otras empresas.

**Aprobación formal:** antes de aprobar, el aprobador visualiza resumen ejecutivo, partidas observadas/excluidas, índices aplicados, resultado neto, cambios frente a la versión anterior, alertas, reporte detallado, evidencias documentales, y confirma que revisó los resultados. La aprobación registra usuario, rol, fecha/hora, versión de cálculo, comentario, y firma electrónica o mecanismo de confirmación si aplica.

## 15. Reportes requeridos

Parametrizables por empresa, ejercicio y versión de cálculo.

- **Operativos:** listado de empresas; ejercicios y su estado; partidas pendientes de clasificación/soporte; índices cargados/aprobados/pendientes; movimientos por período; importaciones realizadas; bitácora de cambios; alertas/validaciones pendientes.
- **Ajuste inicial:** hoja de trabajo; relación de activos/pasivos no monetarios incluidos; factores por partida; ajuste individual/por cuenta/por categoría; Balance Fiscal Actualizado Inicial; variación neta de patrimonio; partidas excluidas y motivo; reporte de activos actualizados (si aplica); resumen para revisión tributaria.
- **Reajuste regular:** hoja de trabajo; comparativo saldo inicial vs. cierre; detalle de movimientos; factores aplicados; ajuste por activo/pasivo/patrimonio; resultado neto; resumen de conciliación fiscal; Balance Fiscal Actualizado de cierre; detalle de depreciaciones/amortizaciones; detalle de bajas/ventas/cancelaciones; partidas con tratamiento pendiente; diferencias entre versiones de cálculo.
- **Auditoría:** historial por partida; historial de índices; historial de versiones de reglas; historial de cálculos/aprobaciones/reaperturas; bitácora de usuarios; documentos adjuntos y faltantes.

## 16. Ejemplos funcionales de referencia (para pruebas)

**Ajuste inicial:**

| Partida | Tipo | Valor histórico | Índice base | Índice de cierre | Factor | Valor actualizado | Ajuste |
|---|---|---:|---:|---:|---:|---:|---:|
| Vehículo | Activo no monetario | 100.000 | 100,00000 | 300,00000 | 3,00000 | 300.000 | 200.000 |
| Maquinaria | Activo no monetario | 500.000 | 250,00000 | 300,00000 | 1,20000 | 600.000 | 100.000 |
| Obligación no monetaria | Pasivo no monetario | 120.000 | 100,00000 | 300,00000 | 3,00000 | 360.000 | 240.000 |

Consolidado: ajuste de activos 300.000 · ajuste de pasivos 240.000 · efecto neto sobre patrimonio 60.000.

**Reajuste regular:** maquinaria existente 600.000 (índice anterior 300 → índice actual 450): factor 1,50 ⇒ 900.000, reajuste 300.000. Nueva máquina adquirida en el período por 400.000 con índice 360 en la fecha de compra: factor 450/360 = 1,25 ⇒ 500.000, reajuste 100.000. Deben tratarse por separado: partida existente vs. movimiento del período, cada una con su propio índice base.

## 17. Casos de aceptación obligatorios

Antes de producción, el responsable tributario debe aprobar casos para (mínimo 20):
1. Ajuste inicial de activo no monetario. 2. Ajuste inicial de pasivo no monetario. 3. Ajuste inicial con efecto neto patrimonial positivo. 4. Idem negativo. 5. Reajuste regular de partida existente desde el ejercicio anterior. 6. Adquisición de activo durante el ejercicio. 7. Venta de activo durante el ejercicio. 8. Baja/retiro de activo. 9. Pasivo con pago parcial. 10. Pasivo cancelado. 11. Movimiento de patrimonio. 12. Partida monetaria excluida. 13. Partida no clasificada bloqueada. 14. Índice faltante que impide cálculo. 15. Índice corregido que genera nueva versión. 16. Importación de saldos con diferencias. 17. Reapertura de ejercicio cerrado. 18. Recálculo sin alterar la versión aprobada anterior. 19. Diferencias de redondeo. 20. Reporte final contrastado contra cálculo manual del asesor.

Cada caso debe documentar: nombre, objetivo, datos de entrada, índices/reglas aplicables, resultado esperado (detalle por partida y consolidado), reportes que deben reflejarlo, responsable y fecha de aprobación. **El motor de cálculo no se considera terminado hasta que estos 20 casos pasen exactamente contra los valores aprobados por el asesor tributario.**

## 18. Auditoría (requisitos funcionales)

Bitácora inalterable o de alta integridad para: creación/modificación de empresas; apertura/cierre de ejercicios; carga/modificación/aprobación/reemplazo de índices; importación de saldos/movimientos; clasificación/reclasificación de partidas; carga y eliminación lógica de documentos; ejecución de cálculos; cambios de reglas; aprobación de resultados; reapertura de períodos; exportación de reportes; cambios de permisos; inicio de sesión y operaciones sensibles.

Cada evento registra: fecha/hora, usuario, rol, empresa, ejercicio, entidad afectada, identificador del registro, acción, valores anteriores/nuevos, motivo/comentario, IP/información técnica si aplica.

## 19. Seguridad y confidencialidad (requisitos funcionales)

Autenticación segura; contraseñas cifradas; recuperación de acceso controlada; roles y permisos por empresa; aislamiento estricto de datos entre empresas; registro de sesiones; protección de archivos adjuntos; enlaces temporales/protegidos para descargas; copias de respaldo; recuperación ante fallos; cifrado en tránsito (HTTPS); políticas de retención; eliminación lógica en lugar de física cuando se requiera auditoría; exportaciones controladas por rol; ningún dato fiscal expuesto mediante URLs públicas.

## 20. Requisitos no funcionales

**Rendimiento:** los cálculos se ejecutan como un proceso identificable (job), con estado de avance, resultado, errores y reintento controlado. Definir con el cliente: número de empresas, ejercicios por empresa, cuentas, partidas ajustables, movimientos anuales, archivos adjuntos, usuarios concurrentes.

**Disponibilidad:** definir con el cliente horario de operación, necesidad de acceso fuera de horario, nivel de disponibilidad esperado, política de mantenimiento.

---

# PARTE B — ARQUITECTURA TÉCNICA (obligatoria)

## 21. Stack tecnológico obligatorio

| Capa | Tecnología | Notas de uso obligatorias |
|---|---|---|
| Framework | **Next.js 16.x** | App Router únicamente. **Sin `middleware.ts`**: el control de acceso se implementa como una **capa de proxy** (ver §23) y guardas explícitas en Server Components/Server Actions/Route Handlers. |
| UI runtime | **React 19.x** | Server Components por defecto; Client Components solo donde haya interactividad real (formularios, tablas editables, wizards de cálculo). Usar `useActionState`/`useFormStatus` para formularios ligados a Server Actions. |
| Lenguaje | **TypeScript** (`strict: true`) | Prohibido `any` implícito. Todo contrato de datos (DTO) definido con `zod` y tipos inferidos (`z.infer<...>`). |
| Estilos | **Tailwind CSS 4.x** | Config basada en `@theme` (CSS-first). Sin CSS-in-JS. Componentes de UI reutilizables en `src/components/ui`. |
| ORM | **Prisma ORM 7.x** | Un único `schema.prisma` como fuente de verdad del modelo de datos (ver §24). Cliente Prisma generado con output personalizado y consumido vía un singleton (`src/lib/db.ts`) para evitar múltiples conexiones en desarrollo. |
| Base de datos | **PostgreSQL sobre Neon.tech** | Usar el *pooled connection string* de Neon para runtime de la app (`DATABASE_URL`) y el *direct connection string* para migraciones (`DIRECT_URL`). Habilitar `previewFeatures` o adaptador acorde a la versión de Prisma para el *connection pooling* de Neon. |
| Hosting/CI-CD | **Vercel** | Despliegue de la app Next.js; variables de entorno gestionadas en el dashboard de Vercel por entorno (Production/Preview/Development). Los *cron jobs* de Vercel se usan para tareas programadas (p. ej. recordatorios de cierre de período), nunca para ejecutar el motor de cálculo completo si este puede exceder el timeout de la función. |
| API interna | **Route Handlers** (`app/api/.../route.ts`) y **Server Actions** | Ver criterio de uso en §22. |
| Autenticación | **Sesiones basadas en cookies `httpOnly`** | Sin JWT en `localStorage`/`sessionStorage`. Ver diseño completo en §23. |

## 22. Criterio: Route Handlers vs. Server Actions

Regla general: **Server Actions son el mecanismo por defecto** para toda mutación disparada desde una UI de este sistema (formularios, aprobaciones, ejecución de cálculos, cargas). **Route Handlers** se reservan para los casos en que se necesita un contrato HTTP explícito:

| Usar **Server Action** cuando… | Usar **Route Handler** cuando… |
|---|---|
| La mutación se origina en un formulario o botón de la propia UI (crear empresa, clasificar partida, aprobar cálculo, cerrar ejercicio) | Se necesita un endpoint consumido por un sistema externo (integración contable, API de terceros) |
| El resultado alimenta directamente un Server Component vía revalidación (`revalidatePath`/`revalidateTag`) | Se necesita descargar un archivo binario (Excel/PDF) con headers de `Content-Disposition` |
| No se requiere streaming de la respuesta | Se requiere un *webhook* entrante (p. ej. resultado de un proceso de importación asíncrono) |
| — | Se necesita exponer un endpoint de *health check* (`/api/health`) para monitoreo en Vercel |
| — | Se necesita un endpoint SSE/streaming para reportar avance de un cálculo de larga duración |

Toda Server Action y todo Route Handler mutador debe:
1. Revalidar la sesión (ver §23) y el rol/permiso antes de tocar cualquier dato (nunca confiar en que el cliente ya validó).
2. Validar el payload con un esquema `zod` específico de la acción.
3. Verificar el aislamiento por empresa (`empresaId` del recurso === `empresaId` de la sesión activa del usuario, salvo rol `AUDITOR_GLOBAL`).
4. Ejecutar la mutación dentro de una transacción Prisma (`prisma.$transaction`) cuando afecte más de una tabla.
5. Escribir el registro de auditoría (§29) como parte de la misma transacción cuando el evento sea auditable.
6. Retornar un tipo de resultado discriminado: `{ ok: true; data: T } | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string,string[]> } }`. Nunca lanzar excepciones no controladas hacia el cliente.

## 23. Autenticación y sesiones (App Router sin middleware, con proxy)

Requisito explícito: **App Router, sin `middleware.ts`**. El control de acceso se resuelve con una combinación de:

### 23.1 Modelo de sesión
- Tabla `Sesion` en PostgreSQL (no JWT autocontenido): al autenticar, se crea una fila con `id` (token opaco de alta entropía, generado con `crypto.randomBytes(32)` y almacenado **hasheado** con SHA-256 en la base de datos — el valor en claro solo vive en la cookie), `userId`, `empresaActivaId` (para usuarios con acceso a varias empresas), `creadoEn`, `expiraEn`, `ip`, `userAgent`, `revocadaEn`.
- Cookie `session` con atributos: `httpOnly: true`, `secure: true` (en producción), `sameSite: "lax"`, `path: "/"`, `maxAge` acorde a la política de expiración (p. ej. 12h deslizante + expiración absoluta a 7 días).
- Toda validación de sesión se hace contra la tabla `Sesion` (permite revocación inmediata, cierre de sesión remoto y auditoría de sesiones activas — requisito de §19).

### 23.2 "Proxy" en lugar de middleware
En vez de `middleware.ts`, se implementa una función de guarda centralizada `requireSession()` / `requireRole()` en `src/lib/auth/session.ts`, invocada explícitamente al inicio de:
- Cada `layout.tsx` de un segmento protegido (p. ej. `app/(app)/layout.tsx`), para bloquear el render de todo el árbol si no hay sesión válida — esto actúa como el "proxy" de entrada a la zona autenticada.
- Cada Server Action mutadora (§22).
- Cada Route Handler bajo `app/api/**`.

```ts
// src/lib/auth/session.ts
export async function getSession(): Promise<SesionActiva | null> { /* lee cookie, valida hash contra tabla Sesion, chequea expiraEn/revocadaEn */ }
export async function requireSession(): Promise<SesionActiva> { /* getSession() o redirect('/login') / throw AuthError en Server Actions y Route Handlers */ }
export async function requireRole(roles: RolSistema[]): Promise<SesionActiva> { /* requireSession() + chequeo de rol/permiso */ }
export async function requireEmpresaAccess(empresaId: string): Promise<SesionActiva> { /* requireSession() + verificación de UsuarioEmpresaRol */ }
```
Adicionalmente, un grupo de rutas `app/(app)/` agrupa todo lo protegido bajo un único `layout.tsx` que llama `requireSession()`; el grupo `app/(public)/` (login, recuperación de acceso) no lo llama. Esto centraliza el "proxy de entrada" sin usar `middleware.ts`.

### 23.3 Login y contraseñas
- Contraseñas con `argon2id` (o `bcrypt` como alternativa aprobada) — nunca texto plano ni hash reversible.
- Rate limiting de intentos de login por IP y por usuario (tabla `IntentoLogin` o almacenamiento en Neon con TTL logico), con bloqueo temporal tras N intentos fallidos.
- Recuperación de acceso vía token de un solo uso, expirable, enviado por el canal aprobado por el cliente (correo), almacenado hasheado, nunca reenviable.
- Cierre de sesión: revoca la fila en `Sesion` (`revocadaEn = now()`) y limpia la cookie.
- "Cerrar todas las sesiones": revoca todas las filas activas del usuario.

### 23.4 CSRF
Las Server Actions de Next.js incluyen protección CSRF nativa (verificación de origen); para los Route Handlers mutadores expuestos a formularios tradicionales, validar explícitamente el header `Origin`/`Referer` contra la URL configurada de la app antes de procesar.

## 24. Modelo de datos (Prisma ORM 7.x sobre PostgreSQL/Neon)

> Esquema de referencia. El agente debe generarlo completo en `prisma/schema.prisma`, con migraciones incrementales (`prisma migrate dev` en desarrollo, `prisma migrate deploy` en el pipeline de Vercel). Todos los `id` son `String @id @default(uuid())` salvo indicación contraria. Todas las tablas de negocio llevan `creadoEn DateTime @default(now())` y `actualizadoEn DateTime @updatedAt`.

```prisma
// prisma/schema.prisma (extracto estructural — el agente debe completar índices,
// relaciones inversas y constraints adicionales según Prisma 7.x)

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled (Neon)
  directUrl = env("DIRECT_URL")     // direct (para migraciones)
}

generator client {
  provider = "prisma-client-js"
}

enum EstadoEmpresa { ACTIVA INACTIVA ARCHIVADA }

model Empresa {
  id                    String   @id @default(uuid())
  razonSocial           String
  rif                   String   @unique
  direccionFiscal       String
  actividadEconomica    String
  fechaInicioOperaciones DateTime
  fechaCierreHabitual   String   // p.ej. "12-31"
  condicionTributaria   String?
  estado                EstadoEmpresa @default(ACTIVA)
  responsableContableId String?
  responsableTributarioId String?
  zonaHoraria           String   @default("America/Caracas")
  monedaBase            String   @default("VES")
  politicaRedondeo      String   @default("HALF_UP")
  ejercicios            EjercicioFiscal[]
  cuentas               CuentaContable[]
  usuariosEmpresa       UsuarioEmpresaRol[]
  documentos            Documento[]
  creadoEn              DateTime @default(now())
  actualizadoEn         DateTime @updatedAt
}

enum EstadoEjercicio { BORRADOR EN_PREPARACION PENDIENTE_DE_REVISION OBSERVADO APROBADO CERRADO REABIERTO ANULADO }

model EjercicioFiscal {
  id                 String   @id @default(uuid())
  empresaId          String
  empresa            Empresa  @relation(fields: [empresaId], references: [id])
  fechaInicio        DateTime
  fechaCierre        DateTime
  anio               Int
  estado             EstadoEjercicio @default(BORRADOR)
  fechaCalculo       DateTime?
  fechaRevision      DateTime?
  fechaAprobacion    DateTime?
  fechaCierreProceso DateTime?
  versionReglasId    String?
  versionIndicesId   String?
  observaciones      String?
  partidas           Partida[]
  movimientos        Movimiento[]
  calculos           Calculo[]
  creadoEn           DateTime @default(now())
  actualizadoEn      DateTime @updatedAt

  @@unique([empresaId, anio])
}

enum CategoriaFiscal {
  ACTIVO_NO_MONETARIO PASIVO_NO_MONETARIO PARTIDA_MONETARIA PATRIMONIO
  INVENTARIO PROPIEDAD_PLANTA_EQUIPO INTANGIBLE INVERSION_PERMANENTE
  CONSTRUCCION_EN_PROCESO DEUDA_LARGO_PLAZO DEPRECIACION_ACUMULADA
  AMORTIZACION_ACUMULADA PARTIDA_EXCLUIDA REQUIERE_REVISION
}

model CuentaContable {
  id                 String   @id @default(uuid())
  empresaId          String
  empresa            Empresa  @relation(fields: [empresaId], references: [id])
  codigo             String
  nombre             String
  naturaleza         String   // activo|pasivo|patrimonio|ingreso|costo|gasto|orden|otra
  categoriaFiscal    CategoriaFiscal
  esMonetaria        Boolean
  elegibleParaAjuste Boolean  @default(false)
  cuentaContrapartidaId String?
  vigenteDesde       DateTime
  activa             Boolean  @default(true)
  fundamentoClasificacion String?
  aprobadaPorId      String?
  partidas           Partida[]
  creadoEn           DateTime @default(now())
  actualizadoEn      DateTime @updatedAt

  @@unique([empresaId, codigo])
}

enum EstadoIndice { BORRADOR APROBADO REEMPLAZADO ANULADO }

model IndicePrecio {
  id            String   @id @default(uuid())
  tipo          String   // p.ej. "INPC"
  fuente        String
  anio          Int
  mes           Int
  valor         Decimal  @db.Decimal(18, 8)
  fechaPublicacion DateTime
  medioCarga    String   // manual|importacion|integracion
  archivoSoporteId String?
  cargadoPorId  String
  aprobadoPorId String?
  estado        EstadoIndice @default(BORRADOR)
  version       Int      @default(1)
  observacion   String?
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt

  @@unique([tipo, fuente, anio, mes, version])
}

enum EstadoPartida {
  BORRADOR PENDIENTE_DE_SOPORTE PENDIENTE_DE_CLASIFICACION PENDIENTE_DE_REVISION
  VALIDADA INCLUIDA_EN_CALCULO EXCLUIDA VENDIDA DADA_DE_BAJA CANCELADA BLOQUEADA_POR_CIERRE
}

model Partida {
  id                    String   @id @default(uuid())
  empresaId             String
  ejercicioIncorporacionId String
  ejercicioIncorporacion EjercicioFiscal @relation(fields: [ejercicioIncorporacionId], references: [id])
  cuentaContableId      String
  cuentaContable        CuentaContable  @relation(fields: [cuentaContableId], references: [id])
  categoriaFiscal       CategoriaFiscal
  tipo                  String   // activo|pasivo|patrimonio
  esMonetaria           Boolean
  descripcion           String
  referenciaDocumento   String?
  documentoRespaldoId   String?
  fechaAdquisicion      DateTime
  fechaUltimaActualizacionFiscal DateTime?
  fechaBajaVenta        DateTime?
  valorHistorico        Decimal  @db.Decimal(18, 2)
  valorFiscalBase       Decimal  @db.Decimal(18, 2)
  ajusteAcumulado       Decimal  @db.Decimal(18, 2) @default(0)
  valorFiscalActualizado Decimal @db.Decimal(18, 2) @default(0)
  vidaUtilMeses         Int?
  metodoDepreciacion    String?
  depreciacionAcumulada Decimal? @db.Decimal(18, 2)
  estado                EstadoPartida @default(BORRADOR)
  reglaAplicadaId       String?
  observaciones         String?
  movimientos           Movimiento[]
  creadoEn              DateTime @default(now())
  actualizadoEn          DateTime @updatedAt
}

enum TipoMovimiento {
  ADQUISICION INCORPORACION MEJORA CAPITALIZACION TRANSFERENCIA RECLASIFICACION
  DEPRECIACION AMORTIZACION VENTA RETIRO BAJA SINIESTRO CANCELACION_DE_PASIVO
  NUEVA_OBLIGACION PAGO_PARCIAL APORTE_DE_CAPITAL AUMENTO_DE_CAPITAL
  REDUCCION_DE_CAPITAL DIVIDENDO DISTRIBUCION_DE_UTILIDADES CORRECCION
}

model Movimiento {
  id                String   @id @default(uuid())
  ejercicioId       String
  ejercicio         EjercicioFiscal @relation(fields: [ejercicioId], references: [id])
  partidaId         String
  partida           Partida  @relation(fields: [partidaId], references: [id])
  tipo              TipoMovimiento
  fechaEfectiva     DateTime
  valor             Decimal  @db.Decimal(18, 2)
  documentoRespaldoId String?
  cuentaOrigenId    String?
  cuentaDestinoId   String?
  tratamientoFiscal String?
  indiceBaseId      String?
  estadoAprobacion  String   @default("PENDIENTE")
  observacion       String?
  responsableId     String
  creadoEn          DateTime @default(now())
  actualizadoEn     DateTime @updatedAt
}

enum EstadoCalculo { NO_INICIADO EN_PROCESO CALCULADO_PRELIMINAR CON_OBSERVACIONES PENDIENTE_DE_APROBACION APROBADO CERRADO REABIERTO ANULADO }
enum TipoCalculo { AJUSTE_INICIAL REAJUSTE_REGULAR }

model Calculo {
  id                String   @id @default(uuid())
  ejercicioId       String
  ejercicio         EjercicioFiscal @relation(fields: [ejercicioId], references: [id])
  tipo              TipoCalculo
  version           Int      @default(1)
  estado            EstadoCalculo @default(NO_INICIADO)
  versionReglasSnapshot Json  // congelado en el momento del cálculo (principio 3.4 / 8.4.2)
  versionIndicesSnapshot Json
  resultadoConsolidado Json?
  ejecutadoPorId    String
  aprobadoPorId     String?
  fechaAprobacion   DateTime?
  comentarioAprobacion String?
  detalles          CalculoDetallePartida[]
  creadoEn          DateTime @default(now())
  actualizadoEn     DateTime @updatedAt
}

model CalculoDetallePartida {
  id              String   @id @default(uuid())
  calculoId       String
  calculo         Calculo  @relation(fields: [calculoId], references: [id])
  partidaId       String
  indiceBaseValor Decimal  @db.Decimal(18, 8)
  indiceCierreValor Decimal @db.Decimal(18, 8)
  factor          Decimal  @db.Decimal(18, 8)
  valorBase       Decimal  @db.Decimal(18, 2)
  valorActualizado Decimal @db.Decimal(18, 2)
  ajuste          Decimal  @db.Decimal(18, 2)
  incluida        Boolean  @default(true)
  motivoExclusion String?
}

model Documento {
  id           String   @id @default(uuid())
  empresaId    String
  empresa      Empresa  @relation(fields: [empresaId], references: [id])
  nombreArchivo String
  tipoArchivo  String
  urlAlmacenamiento String  // ver §31 (Vercel Blob u otro almacenamiento configurado)
  subidoPorId  String
  eliminadoLogicamente Boolean @default(false)
  creadoEn     DateTime @default(now())
}

model VersionReglas {
  id          String   @id @default(uuid())
  descripcion String
  reglasJson  Json     // fórmulas, criterios de redondeo, criterios de índice base por tipo de movimiento, etc.
  vigenteDesde DateTime
  aprobadoPorId String?
  creadoEn    DateTime @default(now())
}

enum RolSistema { ADMINISTRADOR OPERADOR CONTADOR ASESOR_TRIBUTARIO SUPERVISOR AUDITOR CLIENTE_FINAL }

model Usuario {
  id            String   @id @default(uuid())
  nombre        String
  correo        String   @unique
  hashPassword  String
  activo        Boolean  @default(true)
  empresas      UsuarioEmpresaRol[]
  sesiones      Sesion[]
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt
}

model UsuarioEmpresaRol {
  id         String   @id @default(uuid())
  usuarioId  String
  usuario    Usuario  @relation(fields: [usuarioId], references: [id])
  empresaId  String
  empresa    Empresa  @relation(fields: [empresaId], references: [id])
  rol        RolSistema
  creadoEn   DateTime @default(now())

  @@unique([usuarioId, empresaId, rol])
}

model Sesion {
  id            String   @id                     // hash del token, no el token en claro
  usuarioId     String
  usuario       Usuario  @relation(fields: [usuarioId], references: [id])
  empresaActivaId String?
  creadoEn      DateTime @default(now())
  expiraEn      DateTime
  ip            String?
  userAgent     String?
  revocadaEn    DateTime?
}

model BitacoraAuditoria {
  id             String   @id @default(uuid())
  fechaHora      DateTime @default(now())
  usuarioId      String?
  rol            String?
  empresaId      String?
  ejercicioId    String?
  entidadAfectada String  // nombre del modelo
  identificadorRegistro String
  accion         String  // CREAR|MODIFICAR|APROBAR|CERRAR|REABRIR|EXPORTAR|ELIMINAR_LOGICO|...
  valoresAnteriores Json?
  valoresNuevos  Json?
  motivo         String?
  ipInfo         String?

  @@index([empresaId, entidadAfectada, fechaHora])
}
```

**Notas de diseño obligatorias sobre el esquema:**
- Todo monto es `Decimal`, **nunca `Float`** (riesgo de error de redondeo en cálculos fiscales — viola §3.2/§12).
- `Calculo.versionReglasSnapshot` / `versionIndicesSnapshot` materializan el principio 3.3/3.4/8.4.2: un cálculo aprobado queda inmutable aunque cambien los índices o reglas después.
- Ninguna tabla de negocio permite `DELETE` físico desde la capa de aplicación; se usa `eliminadoLogicamente` o campos de estado (`ANULADO`, `REVOCADA`, etc.), conforme a §19.
- El agente debe añadir índices compuestos (`@@index`) en cada llave foránea usada en filtros frecuentes (`empresaId`, `ejercicioId`, `estado`).

## 25. Multi-tenancy y aislamiento por empresa

- Todo modelo de negocio cuelga directa o indirectamente de `Empresa`.
- Ninguna consulta Prisma de negocio se ejecuta sin un filtro `empresaId` explícito derivado de la sesión activa (`requireEmpresaAccess`), salvo para el rol `AUDITOR` con alcance ampliado explícitamente concedido.
- Se prohíbe construir cualquier query dinámica a partir de un `empresaId` recibido del cliente sin verificarlo primero contra `UsuarioEmpresaRol`.
- Recomendado: un helper `withEmpresaScope(prismaQuery, empresaId)` o un *repository* por entidad que siempre reciba `empresaId` como primer argumento obligatorio, para que sea estructuralmente imposible omitirlo.

## 26. Server Actions — catálogo de referencia

El agente debe implementar (como mínimo) las siguientes Server Actions, agrupadas por módulo, en `src/actions/<modulo>.ts`:

**Empresas:** `crearEmpresa`, `actualizarEmpresa`, `archivarEmpresa`, `asignarResponsables`.
**Usuarios/Roles:** `invitarUsuario`, `asignarRolEmpresa`, `revocarRolEmpresa`, `desactivarUsuario`.
**Ejercicios fiscales:** `crearEjercicioFiscal`, `avanzarEstadoEjercicio`, `reabrirEjercicio` (requiere motivo + rol autorizado).
**Cuentas contables:** `importarPlanDeCuentas`, `clasificarCuenta`, `aprobarClasificacionCuenta`.
**Índices:** `cargarIndice`, `aprobarIndice`, `reemplazarIndice` (crea nueva versión, nunca sobrescribe).
**Partidas:** `crearPartida`, `clasificarPartida`, `adjuntarDocumentoPartida`, `marcarPartidaExcluida`, `venderOBajarPartida`.
**Movimientos:** `registrarMovimiento`, `aprobarMovimiento`, `importarMovimientosMasivo`.
**Cálculo:** `ejecutarAjusteInicial`, `ejecutarReajusteRegular`, `recalcular`, `marcarObservaciones`, `aprobarCalculo`, `cerrarCalculo`.
**Importación:** `iniciarImportacion`, `confirmarImportacion` (tras revisar diff), `descartarImportacion`.
**Reportes:** `generarReporte` (retorna referencia al archivo generado; la descarga real ocurre por Route Handler, ver §22/§28).

Cada Server Action sigue la firma:
```ts
"use server";
export async function accionX(input: unknown): Promise<ActionResult<TSalida>> {
  const sesion = await requireRole([...rolesPermitidos]);
  const datos = EsquemaZodX.parse(input); // lanza si es inválido -> capturado y mapeado a ActionResult de error
  await requireEmpresaAccess(datos.empresaId);
  // lógica + transacción + auditoría
  revalidatePath(...); // o revalidateTag(...)
  return { ok: true, data: ... };
}
```

## 27. Motor de cálculo — diseño técnico

Implementado como módulo puro de dominio en `src/domain/calculo/`, **sin dependencias de Next.js ni de Prisma directamente** (recibe datos ya cargados y devuelve resultados; la persistencia ocurre en la capa de Server Action que lo invoca). Esto permite probarlo unitariamente contra los 20 casos de aceptación (§17) sin base de datos.

```ts
// src/domain/calculo/tipos.ts
export interface PartidaParaCalculo {
  id: string;
  categoriaFiscal: CategoriaFiscal;
  esMonetaria: boolean;
  valorFiscalBase: Decimal;
  fechaAdquisicion: Date;
  fechaBajaVenta?: Date;
  estado: EstadoPartida;
}

export interface IndiceResuelto { anio: number; mes: number; valor: Decimal }

export interface ResultadoPartidaCalculada {
  partidaId: string;
  indiceBase: Decimal;
  indiceCierre: Decimal;
  factor: Decimal;
  valorActualizado: Decimal;
  ajuste: Decimal;
  incluida: boolean;
  motivoExclusion?: string;
}

export interface ReglasCalculo {
  precisionIndices: number;
  precisionFactores: number;
  precisionInterna: number;
  precisionMonetaria: number;
  reglaRedondeo: "HALF_UP" | "HALF_EVEN" | "DOWN";
  resolverIndiceBaseMovimiento: (fechaMovimiento: Date) => "MES_MOVIMIENTO" | "MES_ANTERIOR" | "PROMEDIO" | "FECHA_INCORPORACION";
}

export function calcularAjusteInicial(
  partidas: PartidaParaCalculo[],
  resolverIndice: (fecha: Date) => IndiceResuelto,
  indiceCierre: IndiceResuelto,
  reglas: ReglasCalculo
): ResultadoPartidaCalculada[] { /* implementa fórmula de §8.3 con Decimal.js, nunca number/float */ }

export function calcularReajusteRegular(
  saldosAnteriores: { partidaId: string; valorFiscalActualizadoAnterior: Decimal }[],
  movimientosDelPeriodo: MovimientoParaCalculo[],
  indiceCierreAnterior: IndiceResuelto,
  indiceCierreActual: IndiceResuelto,
  resolverIndiceMovimiento: (fecha: Date) => IndiceResuelto,
  reglas: ReglasCalculo
): { saldos: ResultadoPartidaCalculada[]; movimientos: ResultadoPartidaCalculada[] } { /* §9.4 y §9.5 */ }
```

**Requisitos duros del motor:**
- Usar una librería de precisión arbitraria decimal (`decimal.js` o el tipo `Decimal` de Prisma) en **todo** el pipeline de cálculo; prohibido usar `number` de JavaScript para montos, índices o factores intermedios.
- El redondeo se aplica **solo** en la función de presentación/consolidación final, nunca dentro del pipeline de cálculo (principio de §12).
- Todo resultado debe incluir, además del monto, los insumos que lo produjeron (índice base, índice de cierre, factor) — nunca devolver solo el número final (principio 3.2).
- Una partida sin clasificación aprobada, sin índice resoluble, o en estado no elegible **debe** excluirse con `motivoExclusion` explícito, nunca lanzar una excepción silenciosa que aborte todo el cálculo (salvo error de datos verdaderamente bloqueante, que debe reportarse como fallo estructurado del cálculo, no como *crash*).
- El motor es una función pura y determinista: mismos insumos ⇒ mismo resultado exacto (requisito de reproducibilidad de §2).

## 28. Route Handlers — catálogo de referencia

```
GET  /api/health                                    -> health check para Vercel
GET  /api/empresas/[empresaId]/reportes/[reporteId]  -> descarga de reporte generado (Excel/PDF, streaming)
POST /api/empresas/[empresaId]/importaciones/[id]/procesar -> disparo de job de importación pesada
GET  /api/empresas/[empresaId]/calculos/[calculoId]/progreso -> SSE/polling de avance de un cálculo largo
```
Todos requieren `requireEmpresaAccess` + `requireRole` según la operación, y aplican los mismos principios de auditoría y transacción que las Server Actions.

## 29. Auditoría — implementación técnica

- Helper `registrarAuditoria(tx, evento)` invocado **dentro** de la misma transacción Prisma que la mutación de negocio, para garantizar que nunca exista una mutación sin su registro correspondiente (o ambas fallan, o ambas se confirman).
- `BitacoraAuditoria` es *append-only* desde la capa de aplicación: no se expone ninguna Server Action de actualización o borrado sobre esta tabla.
- Los reportes de auditoría (§15) se generan por consulta de solo lectura sobre esta tabla, filtrada siempre por `empresaId`.

## 30. Reportes y exportación

- Generación de Excel: librería server-side (p. ej. `exceljs`) ejecutada en un Route Handler o en un job asíncrono para reportes grandes; nunca en el cliente.
- Generación de PDF: renderizado server-side (p. ej. `@react-pdf/renderer` o generación de HTML + conversión) para papeles de trabajo con formato fijo.
- Todo archivo generado se registra como `Documento` (o una entidad `ReporteGenerado` análoga) con referencia a `calculoId`/versión, para que la exportación indique siempre versión de cálculo, fecha de generación y estado del período (regla de §10.3).
- Las descargas siempre pasan por un Route Handler que valida permisos antes de servir el binario (nunca URLs públicas directas al almacenamiento, conforme a §19).

## 31. Almacenamiento de documentos de respaldo

- Los archivos adjuntos (soportes, comprobantes) se almacenan en un servicio de blobs compatible con Vercel (p. ej. Vercel Blob) o el proveedor que el cliente apruebe; **nunca** en el filesystem del servidor (no persiste entre despliegues serverless).
- `Documento.urlAlmacenamiento` guarda una referencia interna (no una URL pública firmada de larga duración); el acceso real se resuelve generando una URL firmada de corta duración en el momento de la descarga, a través de un Route Handler autenticado.

## 32. Procesos de larga duración (cálculos e importaciones)

Dado que Vercel impone límites de tiempo de ejecución por función:
- Un cálculo (`ejecutarAjusteInicial`/`ejecutarReajusteRegular`) se modela como un **job** con estado (`Calculo.estado = EN_PROCESO`), no como una llamada síncrona bloqueante cuando el volumen de partidas pueda ser grande.
- Para volúmenes pequeños/medianos (a definir con el cliente, §20), puede resolverse de forma síncrona dentro de una Server Action.
- Para volúmenes grandes, el agente debe diseñar una cola de procesamiento (p. ej. una tabla de trabajos + un endpoint invocado por un *cron* de Vercel o una función en segundo plano) que actualice `Calculo.estado` y sea consultable vía el Route Handler de progreso (§28).
- Las importaciones masivas (§13) siguen el mismo patrón: validación y *diffing* como paso rápido síncrono; el procesamiento fila-por-fila como job asíncrono si el archivo es grande.

## 33. Plan de ejecución para el agente orquestador (orden recomendado de construcción)

1. **Infraestructura base:** proyecto Next.js 16 + TypeScript + Tailwind 4 + Prisma 7; conexión a Neon (`DATABASE_URL`/`DIRECT_URL`); despliegue inicial vacío en Vercel.
2. **Modelo de datos completo** (§24) + migraciones iniciales.
3. **Autenticación y sesiones** (§23): login, cookie `httpOnly`, tabla `Sesion`, `requireSession`/`requireRole`/`requireEmpresaAccess`, layout protegido `app/(app)/layout.tsx`.
4. **Empresas, usuarios y roles** (§6.1, §14.1) con aislamiento multi-tenant (§25).
5. **Catálogo de cuentas y clasificación fiscal** (§6.3, §7).
6. **Índices de precios** (§6.4) con flujo borrador→aprobado→versión.
7. **Partidas y movimientos** (§6.5, §9.3) con sus estados y validaciones (§11).
8. **Motor de cálculo puro** (§27) + pruebas unitarias contra los 20 casos de aceptación (§17) — **no avanzar sin que estos pasen**.
9. **Orquestación del ajuste inicial** (§8.4) como Server Action/job que invoca el motor puro y persiste `Calculo`/`CalculoDetallePartida`.
10. **Orquestación del reajuste regular** (§9) sobre la misma infraestructura de `Calculo`.
11. **Flujo de revisión → observación → aprobación → cierre → reapertura** (§10, §14.3) con sus reglas de transición.
12. **Auditoría** (§29) integrada retroactivamente a cada mutación ya construida.
13. **Reportes y exportación** (§30, §31).
14. **Importación de datos** (§13, §32).
15. **Endurecimiento de seguridad** (§19, §23.3, §23.4) y revisión de aislamiento multi-tenant.
16. **Suite completa de casos de aceptación end-to-end** (§17) y checklist de requisitos no funcionales (§20).

## 34. Convenciones de código

- Estructura de carpetas sugerida:
```
src/
  app/
    (public)/            # login, recuperación de acceso
    (app)/                # zona autenticada, layout con requireSession()
      empresas/
      ejercicios/
      indices/
      partidas/
      calculos/
      reportes/
      auditoria/
    api/                  # Route Handlers (§28)
  actions/                # Server Actions por módulo (§26)
  domain/
    calculo/              # motor de cálculo puro (§27)
    validaciones/         # reglas de §11 como funciones puras
  lib/
    auth/                 # session.ts, roles.ts
    db.ts                 # singleton de Prisma Client
    audit.ts              # registrarAuditoria()
  components/
    ui/                   # componentes Tailwind reutilizables
prisma/
  schema.prisma
docs/
  decisiones-pendientes.md
```
- Todo esquema de validación de entrada vive junto a su Server Action (`accionX.schema.ts`) y se reexporta para reutilizarse en el formulario cliente (validación optimista) sin duplicar reglas.
- Nomenclatura en español para entidades de dominio (coherente con este documento y con el lenguaje del usuario tributario final); nomenclatura técnica interna (funciones, tipos utilitarios) puede estar en inglés si es idiomático en el ecosistema (p. ej. `ActionResult<T>`).
- Ningún componente de UI contiene lógica de cálculo fiscal; toda regla de negocio vive en `src/domain` o en las Server Actions.

---

## 35. Fuentes normativas y de referencia (para el responsable tributario, no para el agente de código)

1. Ley de Impuesto Sobre la Renta (LISLR) — Asamblea Nacional de Venezuela.
2. Reglamento de la Ley de Impuesto Sobre la Renta.
3. Título IX de la Ley de ISLR (ajuste inicial y reajuste regular).
4. Artículo 170 del Reglamento (actualización/revalorización extraordinaria de activos y pasivos no monetarios).
5. Material técnico de apoyo: Gestiopolis, SciELO Venezuela, Actualidad Contable FACES (ULA), Nayma Consultores, Baker Tilly Venezuela.

**Orden de autoridad para resolver cualquier duda de negocio:** (1) Ley/Reglamento/Gaceta Oficial vigente → (2) criterio escrito del contador/asesor tributario responsable → (3) casos de prueba validados por ese profesional (§17) → (4) material académico/guías de consultoras, solo como contexto de apoyo.

---

## 36. Definición de "hecho" (Definition of Done) para el sistema completo

El sistema se considera listo para revisión del cliente cuando:
- [ ] Los 20 casos de aceptación de §17 pasan exactamente contra los valores aprobados por el asesor tributario.
- [ ] Ningún monto se calcula ni almacena como `Float`/`number` de JavaScript.
- [ ] No existe ninguna Server Action ni Route Handler mutador sin verificación de sesión, rol y `empresaId`.
- [ ] Todo evento de la lista de §18 genera una fila en `BitacoraAuditoria` dentro de la misma transacción.
- [ ] Un cálculo aprobado permanece bit-a-bit idéntico aunque se modifiquen índices o reglas posteriores (verificado con una prueba de regresión explícita).
- [ ] Ningún documento de respaldo es accesible por URL pública sin autenticación.
- [ ] La cookie de sesión es `httpOnly`, `secure` en producción, y toda sesión es revocable desde el propio sistema.
- [ ] No existe archivo `middleware.ts`; el control de acceso está centralizado en los *guards* de §23.2.
- [ ] El `schema.prisma` migra limpiamente sobre Neon usando `directUrl` para migraciones y `url` (pooled) para runtime.
