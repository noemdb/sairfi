# DOMAIN.md — SAIRFI

> Revisión 2026-09-26 (v2). Ver "Registro de mejoras" para el detalle de qué cambió respecto a la versión anterior y por qué.

## 0. Registro de mejoras de esta revisión

| # | Problema detectado en la versión anterior | Corrección aplicada |
|---|---|---|
| 1 | §6.1 usa el estado `PENDIENTE_DE_CLASIFICACION` para una partida sin fecha clara, pero ese valor **no** estaba en la enumeración de `fiscal_items.estado` de §4.4 ni en `DATABASE.md`. | §4.4 ahora incluye `PENDIENTE_DE_CLASIFICACION` en la enumeración de `estado`, y se aclara que es un estado transversal (no exclusivo de venta/baja) — ver también la corrección espejo en `DATABASE.md`. |
| 2 | R-204 ("no se permiten dos ejercicios abiertos simultáneamente") no tenía un mecanismo de aplicación explícito: el único índice único de `fiscal_periods` en `DATABASE.md` era por fechas exactas, que no impide dos ejercicios con fechas distintas ambos `ABIERTO`. | Se añade nota en R-204 señalando el mecanismo de aplicación (índice único parcial por `company_id` mientras el estado no sea `CERRADO`) y se referencia la corrección en `DATABASE.md` §3. |
| 3 | El glosario no distinguía explícitamente entre `estado` de una partida (ciclo de vida: activa/vendida/etc.) y su **clasificación fiscal** (monetaria/no monetaria, categoría) — ambos conceptos se mencionaban sueltos en reglas distintas sin conectarlos. | Se agrega la entrada "Estado de clasificación" al glosario (§1) y se referencia desde R-005 y §6.1. |
| 4 | Faltaba encabezado de documento y fecha de revisión, inconsistente con el resto de los documentos vivos del proyecto. | Agregado. |

***

## 1. Glosario de términos

| Término | Definición |
|---|---|
| **Ajuste por Inflación Fiscal** | Mecanismo legal establecido en la Ley de ISLR que permite actualizar el valor de activos y pasivos no monetarios para reflejar la pérdida de poder adquisitivo causada por la inflación. |
| **Ajuste Inicial** | Actualización extraordinaria de activos y pasivos no monetarios que se realiza una sola vez, en el primer ejercicio gravable en que el contribuyente se acoge al sistema. |
| **Reajuste Regular** | Actualización anual de activos y pasivos no monetarios que se realiza al cierre de cada ejercicio fiscal posterior al ajuste inicial. |
| **Activo No Monetario** | Activo cuyo valor no está expresado en una cantidad fija de unidades monetarias. Ejemplos: inventarios, propiedad planta y equipo, intangibles, inversiones permanentes. |
| **Pasivo No Monetario** | Pasivo cuyo valor no está expresado en una cantidad fija de unidades monetarias. Ejemplos: obligaciones de largo plazo indexadas, ciertos pasivos diferidos. |
| **Partida Monetaria** | Activo o pasivo cuyo valor está expresado en una cantidad fija de unidades monetarias. Ejemplos: caja, bancos, cuentas por cobrar, cuentas por pagar. |
| **Valor Histórico** | Valor original registrado al momento de la adquisición, incorporación o reconocimiento de una partida. |
| **Valor Fiscal Base** | Valor que se utiliza como punto de partida para el cálculo del ajuste de un período. |
| **Valor Fiscal Actualizado** | Valor resultante de aplicar el factor de ajuste al valor fiscal base. |
| **Factor de Actualización** | Cociente entre el índice de cierre y el índice base aplicable a una partida. |
| **Índice Base** | Índice de precios correspondiente al mes de adquisición o al mes anterior a la adquisición de una partida. |
| **Índice de Cierre** | Índice de precios correspondiente al mes de cierre del ejercicio fiscal. |
| **INPC** | Índice Nacional de Precios al Consumidor, publicado por el organismo oficial de estadísticas de Venezuela. |
| **Balance General Fiscal Actualizado** | Estado financiero que muestra activos, pasivos y patrimonio con valores actualizados para fines fiscales. |
| **Ejercicio Fiscal** | Período de 12 meses (o menor en caso de primer ejercicio) para el cual se determina la renta gravable. |
| **Partida Fiscal** | Registro individual que representa un activo, pasivo o componente patrimonial sujeto a ajuste. |
| **Movimiento Fiscal** | Evento que altera una partida: adquisición, incorporación, mejora, depreciación, amortización, venta, baja, retiro, pago, capitalización, aporte, dividendo, reclasificación o corrección. |
| **Estado de clasificación** | Distinto del `estado` de ciclo de vida de una partida (activa/vendida/dada de baja/...): indica si la partida ya tiene asignada su `clasificacion_monetaria` y `categoria_fiscal`, o si está `PENDIENTE_DE_CLASIFICACION` por falta de fecha de adquisición u otro dato requerido (ver §6.1). |
| **Registro de Activos Actualizados (RAR)** | Registro que debe mantenerse de los activos actualizados, cuando aplique según la normativa y el criterio tributario validado. |
| **Renta Gravable** | Base sobre la cual se calcula el impuesto sobre la renta, después de aplicar ajustes, deducciones y exenciones. |
| **Conciliación Fiscal** | Proceso de ajustar los resultados contables para determinar la renta gravable conforme a la Ley de ISLR. |

***

## 2. Principios del dominio

### 2.1. Principio de realidad económica

El ajuste por inflación fiscal busca reflejar la **realidad económica** de la empresa, evitando que se paguen impuestos sobre **enriquecimientos nominales** (inflacionarios) que no son reales.

**Implicación para el sistema:**

- Los cálculos deben basarse en índices oficiales.
- Los valores actualizados deben reflejar el poder adquisitivo del momento de cierre.
- No se deben generar utilidades ficticias por efecto de la inflación.

### 2.2. Principio de anualidad

Cada ejercicio fiscal se calcula de manera **independiente**. Los resultados de un ejercicio no se mezclan con los de otro, salvo para establecer la base de cálculo del ejercicio siguiente.

**Implicación para el sistema:**

- Cada ejercicio debe tener su propio cálculo de ajuste.
- Los saldos de cierre de un ejercicio son la base del ejercicio siguiente.
- No se permiten cálculos cruzados entre ejercicios.

### 2.3. Principio de trazabilidad

Cada cálculo debe poder **rastrear** hasta sus datos, índices y reglas de origen.

**Implicación para el sistema:**

- Registrar versión de índices aplicados.
- Registrar versión de reglas aplicadas.
- Registrar usuario que ejecutó y aprobó el cálculo.
- Conservar histórico de cambios.

### 2.4. Principio de conservación de capital

El ajuste busca **mantener el capital de trabajo** de la empresa, evitando que la inflación erosione su capacidad operativa.

**Implicación para el sistema:**

- El efecto neto del ajuste puede aumentar o disminuir el patrimonio fiscal.
- No se trata de generar utilidades, sino de mantener el valor real del capital.

### 2.5. Principio de legalidad

El sistema se basa en la **Ley de ISLR** y su reglamento. No sustituye el criterio profesional del contador o asesor tributario.

**Implicación para el sistema:**

- Las reglas deben ser configurables y versionadas.
- Los resultados deben ser revisados y aprobados por un profesional.
- El sistema no asume responsabilidad por interpretaciones normativas.

***

## 3. Reglas de negocio

### 3.1. Reglas de clasificación de partidas

| Regla | Descripción | Estado | Fuente |
|---|---|---|---|
| **R-001** | Las partidas monetarias no se ajustan por inflación. | Confirmada | LISLR Art. 173 |
| **R-002** | Los activos no monetarios se ajustan desde su fecha de adquisición. | Confirmada | LISLR Art. 174 |
| **R-003** | Los pasivos no monetarios se ajustan desde su fecha de origen. | Confirmada | LISLR Art. 175 |
| **R-004** | El patrimonio se ajusta conforme a las reglas establecidas. | Confirmada | LISLR Art. 176 |
| **R-005** | Las partidas sin fecha de adquisición clara quedan en estado de clasificación `PENDIENTE_DE_CLASIFICACION` y requieren validación del contador antes de participar en un cálculo (ver §6.1). | Propuesta | Criterio profesional |
| **R-006** | Las partidas con valor histórico cero no generan ajuste. | Confirmada | Criterio profesional |

### 3.2. Reglas de cálculo

| Regla | Descripción | Fórmula | Estado | Fuente |
|---|---|---|---|---|
| **R-101** | Factor de actualización | `Factor = Índice de cierre / Índice base` | Confirmada | LISLR Art. 174 |
| **R-102** | Valor actualizado | `Valor actualizado = Valor fiscal base × Factor` | Confirmada | LISLR Art. 174 |
| **R-103** | Ajuste individual | `Ajuste = Valor actualizado - Valor fiscal base` | Confirmada | LISLR Art. 174 |
| **R-104** | Ajuste neto de activos | `Suma de ajustes de todos los activos no monetarios` | Confirmada | LISLR Art. 174 |
| **R-105** | Ajuste neto de pasivos | `Suma de ajustes de todos los pasivos no monetarios` | Confirmada | LISLR Art. 175 |
| **R-106** | Efecto neto sobre patrimonio | `Ajuste neto de activos - Ajuste neto de pasivos` | Confirmada | LISLR Art. 176 |
| **R-107** | Factor para partidas existentes (reajuste regular) | `Factor = Índice de cierre actual / Índice de cierre anterior` | Confirmada | LISLR Art. 177 |
| **R-108** | Factor para movimientos del período | `Factor = Índice de cierre actual / Índice del mes del movimiento` | Propuesta — pendiente validación del contador antes de Fase 5 (`TODO.md`) | Criterio profesional |
| **R-109** | Base del reajuste regular | `Base = Valor actualizado de cierre anterior + movimientos netos del período` | Propuesta — pendiente validación del contador antes de Fase 5 (`TODO.md`) | Criterio profesional |

### 3.3. Reglas de períodos

| Regla | Descripción | Estado | Fuente |
|---|---|---|---|
| **R-201** | El ajuste inicial se realiza una sola vez, en el primer ejercicio gravable. | Confirmada | LISLR Art. 173 |
| **R-202** | El reajuste regular se realiza al cierre de cada ejercicio fiscal posterior. | Confirmada | LISLR Art. 177 |
| **R-203** | El balance fiscal actualizado de cierre sirve como base para el ejercicio siguiente (`ejercicio_anterior_id`). | Confirmada | LISLR Art. 178 |
| **R-204** | No se permiten dos ejercicios abiertos simultáneamente para la misma empresa (`estado` distinto de `CERRADO`). Se aplica con un índice único parcial por `company_id` en `fiscal_periods` — ver `DATABASE.md` §3, no solo con el índice único por fechas exactas. | Propuesta | Criterio profesional |
| **R-205** | Un ejercicio cerrado no puede modificarse sin reapertura formal (ver §6.4). | Propuesta | Criterio profesional |

### 3.4. Reglas de índices

| Regla | Descripción | Estado | Fuente |
|---|---|---|---|
| **R-301** | Los índices deben provenir de fuente oficial (INE, BCV u otra aprobada). | Confirmada | LISLR Art. 179 |
| **R-302** | Los índices deben cargarse antes de ejecutar un cálculo. | Propuesta | Criterio profesional |
| **R-303** | Los índices usados en cálculos aprobados no pueden modificarse. | Propuesta | Criterio profesional |
| **R-304** | Si se corrige un índice, debe crearse una nueva versión del cálculo. | Propuesta | Criterio profesional |
| **R-305** | Los índices deben tener año, mes, valor y fuente identificada. | Confirmada | LISLR Art. 179 |

### 3.5. Reglas de estados y flujos

| Regla | Descripción | Estados permitidos | Estado | Fuente |
|---|---|---|---|---|
| **R-401** | Un ejercicio fiscal debe tener un estado claro. | `BORRADOR`, `ABIERTO`, `PENDIENTE_DE_REVISION`, `APROBADO`, `CERRADO`, `REABIERTO` | Propuesta | Criterio profesional |
| **R-402** | Un cálculo debe tener un estado claro. | `BORRADOR`, `CALCULADO`, `PENDIENTE_DE_REVISION`, `APROBADO`, `CERRADO`, `ANULADO` | Propuesta | Criterio profesional |
| **R-403** | Un cálculo no puede aprobarse si hay partidas sin clasificar (`estado = PENDIENTE_DE_CLASIFICACION`). | Validación obligatoria | Propuesta | Criterio profesional |
| **R-404** | Un cálculo no puede aprobarse si faltan índices requeridos. | Validación obligatoria | Propuesta | Criterio profesional |
| **R-405** | Un ejercicio cerrado no puede tener cálculos en estado borrador. | Validación obligatoria | Propuesta | Criterio profesional |

### 3.6. Reglas de redondeo

| Regla | Descripción | Configuración | Estado | Fuente |
|---|---|---|---|---|
| **R-501** | Los índices deben tener precisión mínima de 5 decimales. | 5-8 decimales | Confirmada | Práctica contable |
| **R-502** | Los factores deben tener precisión mínima de 8 decimales. | 8 decimales | Propuesta | Criterio profesional |
| **R-503** | Los valores monetarios se presentan con 2 decimales. | 2 decimales | Confirmada | Práctica contable |
| **R-504** | El redondeo se aplica al presentar, no al calcular internamente. | Redondeo al final | Propuesta | Criterio profesional |
| **R-505** | La regla de redondeo (hacia arriba, hacia abajo, par más cercano) debe ser configurable. | Configurable | Propuesta | Criterio profesional |

***

## 4. Entidades del dominio

### 4.1. Empresa

**Atributos:**

- `id`: Identificador único.
- `nombre`: Razón social.
- `rif`: Registro de Información Fiscal.
- `direccionFiscal`: Dirección registrada.
- `actividadEconomica`: Descripción de la actividad.
- `fechaInicioOperaciones`: Fecha de inicio.
- `fechaCierreFiscalHabitual`: Día y mes de cierre habitual.
- `estado`: `ACTIVA`, `INACTIVA`, `ARCHIVADA`.

**Reglas:**

- El RIF debe ser único.
- La fecha de cierre debe ser válida (día 01-31, mes 01-12).
- Una empresa puede tener múltiples ejercicios fiscales, pero solo uno activo a la vez (R-204).

### 4.2. Ejercicio Fiscal

**Atributos:**

- `id`: Identificador único.
- `empresaId`: Referencia a la empresa.
- `fechaInicio`: Fecha de inicio del ejercicio.
- `fechaCierre`: Fecha de cierre del ejercicio.
- `estado`: `BORRADOR`, `ABIERTO`, `PENDIENTE_DE_REVISION`, `APROBADO`, `CERRADO`, `REABIERTO`.
- `tipo`: `INICIAL`, `REGULAR`.
- `ejercicioAnteriorId`: Referencia al ejercicio anterior (para reajuste regular).

**Reglas:**

- La fecha de cierre debe ser posterior a la fecha de inicio.
- No pueden existir dos ejercicios activos (estado distinto de `CERRADO`) para la misma empresa (R-204).
- Un ejercicio regular debe tener un ejercicio anterior aprobado.

### 4.3. Índice de Precios

**Atributos:**

- `id`: Identificador único.
- `tipo`: `INPC`.
- `fuente`: Organismo emisor (INE, BCV, otro).
- `anio`: Año del índice.
- `mes`: Mes del índice (1-12).
- `valor`: Valor numérico del índice.
- `version`: Número de versión (para correcciones).
- `estado`: `BORRADOR`, `APROBADO`, `REEMPLAZADO`.
- `archivoSoporteId`: Referencia al archivo de soporte (opcional).

**Reglas:**

- El valor debe ser numérico y mayor que cero.
- No pueden existir duplicados por tipo, fuente, año y mes (dentro de la misma versión).
- Los índices aprobados no pueden modificarse, solo reemplazarse con nueva versión.

### 4.4. Partida Fiscal

**Atributos:**

- `id`: Identificador único.
- `empresaId`: Referencia a la empresa.
- `ejercicioId`: Referencia al ejercicio fiscal.
- `cuentaContable`: Código de la cuenta contable.
- `nombreCuenta`: Nombre de la cuenta.
- `tipo`: `ACTIVO`, `PASIVO`, `PATRIMONIO`.
- `clasificacionMonetaria`: `MONETARIA`, `NO_MONETARIA` (puede quedar sin asignar mientras `estado = PENDIENTE_DE_CLASIFICACION`).
- `categoriaFiscal`: `INVENTARIO`, `PROPIEDAD_PLANTA_EQUIPO`, `INTANGIBLE`, `INVERSION_PERMANENTE`, `DEUDA_LARGO_PLAZO`, `CAPITAL_SOCIAL`, `RESERVAS`, `RESULTADOS_ACUMULADOS`, `OTRO`.
- `fechaAdquisicion`: Fecha de adquisición o incorporación.
- `valorHistorico`: Valor original registrado.
- `valorFiscalBase`: Valor base para el cálculo.
- `ajusteAcumulado`: Ajuste acumulado de períodos anteriores.
- `valorFiscalActualizado`: Valor actualizado.
- `vidaUtil`: Vida útil en años (para activos depreciables).
- `metodoDepreciacion`: Método de depreciación fiscal.
- `estado`: `ACTIVA`, `VENDIDA`, `DADA_DE_BAJA`, `CANCELADA`, `SUSPENDIDA`, `PENDIENTE_DE_CLASIFICACION`.

**Reglas:**

- Las partidas monetarias no se ajustan.
- Las partidas no monetarias deben tener fecha de adquisición; si no la tienen, `estado = PENDIENTE_DE_CLASIFICACION` (R-005, §6.1) y quedan excluidas de cualquier cálculo hasta que el contador las valide.
- El valor histórico debe ser mayor o igual a cero.
- Una partida no puede estar en dos ejercicios simultáneamente.

### 4.5. Movimiento Fiscal

**Atributos:**

- `id`: Identificador único.
- `partidaId`: Referencia a la partida fiscal.
- `ejercicioId`: Referencia al ejercicio fiscal.
- `tipo`: `ADQUISICION`, `INCORPORACION`, `MEJORA`, `DEPRECIACION`, `AMORTIZACION`, `VENTA`, `RETIRO`, `BAJA`, `CANCELACION`, `RECLASIFICACION`, `CORRECCION`.
- `fecha`: Fecha del movimiento.
- `valor`: Valor del movimiento.
- `documentoSoporte`: Referencia al documento de soporte.
- `indiceBase`: Índice aplicable a la fecha del movimiento.
- `indiceCierre`: Índice de cierre del ejercicio.
- `factorAplicado`: Factor calculado.
- `ajusteGenerado`: Ajuste resultante.

**Reglas:**

- El tipo de movimiento debe ser válido.
- La fecha debe estar dentro del ejercicio fiscal.
- El valor debe ser consistente con el tipo de movimiento.
- Los movimientos de baja o venta no pueden exceder el saldo disponible.

### 4.6. Cálculo de Ajuste

**Atributos:**

- `id`: Identificador único.
- `empresaId`: Referencia a la empresa.
- `ejercicioId`: Referencia al ejercicio fiscal.
- `tipo`: `AJUSTE_INICIAL`, `REAJUSTE_REGULAR`.
- `fechaCalculo`: Fecha de ejecución del cálculo.
- `versionReglas`: Versión de reglas aplicadas.
- `versionIndices`: Versión de índices aplicados.
- `estado`: `BORRADOR`, `CALCULADO`, `PENDIENTE_DE_REVISION`, `APROBADO`, `CERRADO`, `ANULADO`.
- `ajusteTotalActivos`: Suma de ajustes de activos.
- `ajusteTotalPasivos`: Suma de ajustes de pasivos.
- `efectoNetoPatrimonio`: Diferencia entre ajustes de activos y pasivos.
- `aprobadoPor`: Usuario que aprobó.
- `aprobadoEn`: Fecha de aprobación.

**Reglas:**

- Un cálculo debe tener todos los índices requeridos (R-404).
- Un cálculo no puede aprobarse sin revisión, ni con partidas `PENDIENTE_DE_CLASIFICACION` (R-403).
- Un cálculo aprobado no puede modificarse sin anulación formal.

### 4.7. Registro de Auditoría

**Atributos:**

- `id`: Identificador único.
- `usuarioId`: Usuario que realizó la acción.
- `accion`: Tipo de acción realizada.
- `entidadTipo`: Tipo de entidad afectada.
- `entidadId`: Identificador de la entidad.
- `valoresAnteriores`: JSON con valores antes del cambio.
- `valoresNuevos`: JSON con valores después del cambio.
- `ipAddress`: Dirección IP (opcional).
- `fecha`: Fecha y hora de la acción.

**Reglas:**

- Todos los eventos sensibles deben registrarse.
- Los registros de auditoría no pueden modificarse ni eliminarse.
- Debe permitirse consulta histórica.

***

## 5. Casos de uso principales

### 5.1. Registrar empresa y ejercicio fiscal

**Actores:** Administrador.

**Precondiciones:**

- Usuario autenticado con rol de administrador.

**Flujo básico:**

1. El administrador crea una nueva empresa.
2. El sistema valida que el RIF sea único.
3. El administrador crea un nuevo ejercicio fiscal.
4. El sistema valida que las fechas sean coherentes y que no exista ya un ejercicio no cerrado para la empresa (R-204).
5. El ejercicio queda en estado `BORRADOR`.

**Postcondiciones:**

- Empresa registrada.
- Ejercicio fiscal creado.

### 5.2. Cargar índices de inflación

**Actores:** Analista, Asesor tributario.

**Precondiciones:**

- Usuario autenticado.
- Empresa y ejercicio existentes.

**Flujo básico:**

1. El analista carga índices desde archivo o manualmente.
2. El sistema valida formato y valores.
3. Los índices quedan en estado `BORRADOR`.
4. El asesor revisa y aprueba los índices.
5. Los índices quedan en estado `APROBADO`.

**Postcondiciones:**

- Índices disponibles para cálculos.

### 5.3. Registrar partidas fiscales

**Actores:** Analista, Contador.

**Precondiciones:**

- Usuario autenticado.
- Empresa y ejercicio existentes.
- Índices aprobados.

**Flujo básico:**

1. El analista registra partidas manualmente o mediante importación.
2. El sistema valida datos obligatorios; si falta la fecha de adquisición, la partida entra en estado `PENDIENTE_DE_CLASIFICACION` (§6.1) en vez de rechazarse.
3. El contador clasifica cada partida (monetaria/no monetaria, categoría fiscal).
4. Las partidas quedan en estado `ACTIVA`.

**Postcondiciones:**

- Partidas registradas y clasificadas.

### 5.4. Ejecutar ajuste inicial

**Actores:** Analista, Contador, Asesor tributario.

**Precondiciones:**

- Usuario autenticado.
- Ejercicio en estado `ABIERTO`.
- Partidas registradas y clasificadas (ninguna en `PENDIENTE_DE_CLASIFICACION`).
- Índices aprobados.

**Flujo básico:**

1. El analista solicita ejecutar ajuste inicial.
2. El sistema valida precondiciones (R-403, R-404).
3. El motor de cálculo ejecuta el ajuste.
4. Se generan resultados y reportes.
5. El cálculo queda en estado `PENDIENTE_DE_REVISION`.
6. El contador revisa resultados.
7. El asesor aprueba el cálculo.
8. El cálculo queda en estado `APROBADO`.

**Postcondiciones:**

- Balance fiscal actualizado inicial generado.
- Ejercicio listo para cierre o para siguiente ejercicio.

### 5.5. Ejecutar reajuste regular

**Actores:** Analista, Contador, Asesor tributario.

**Precondiciones:**

- Usuario autenticado.
- Ejercicio en estado `ABIERTO`.
- Ejercicio anterior aprobado.
- Partidas registradas y clasificadas.
- Movimientos del período registrados.
- Índices aprobados.

**Flujo básico:**

1. El analista solicita ejecutar reajuste regular.
2. El sistema valida precondiciones.
3. El motor de cálculo ejecuta el reajuste.
4. Se generan resultados y reportes.
5. El cálculo queda en estado `PENDIENTE_DE_REVISION`.
6. El contador revisa resultados.
7. El asesor aprueba el cálculo.
8. El cálculo queda en estado `APROBADO`.

**Postcondiciones:**

- Balance fiscal actualizado de cierre generado.
- Ejercicio listo para cierre.

***

## 6. Excepciones y reglas especiales

### 6.1. Partidas sin fecha clara

**Situación:** Una partida no tiene fecha de adquisición documentada.

**Regla:**

- La partida se marca con `estado = PENDIENTE_DE_CLASIFICACION` (valor añadido a la enumeración en §4.4; ver corrección espejo en `DATABASE.md` §3, tabla `fiscal_items`).
- Queda excluida de cualquier cálculo mientras tenga ese estado (R-403).
- Requiere validación del contador, quien la mueve a `ACTIVA` una vez asignada la fecha y clasificación.

### 6.2. Índices faltantes

**Situación:** No existe índice para el mes de cierre o para el mes de adquisición.

**Regla:**

- El sistema bloquea el cálculo.
- Muestra advertencia: "Índice faltante para el período [mes/año]".
- El usuario debe cargar el índice o ajustar el período.

### 6.3. Corrección de índices

**Situación:** Se detecta un error en un índice aprobado.

**Regla:**

- No se modifica el índice aprobado.
- Se crea una nueva versión del índice.
- Se notifica a los usuarios con cálculos que usaron el índice anterior.
- Se permite recalcular con la nueva versión.

### 6.4. Reapertura de ejercicio cerrado

**Situación:** Se requiere modificar un ejercicio ya cerrado.

**Regla:**

- Se crea un registro de reapertura con motivo y autorización.
- El ejercicio cambia a estado `REABIERTO`.
- Se registran los cambios en auditoría.
- Al cerrar nuevamente, se crea una nueva versión del cálculo.

### 6.5. Partidas monetarias

**Situación:** Una partida clasificada como monetaria se incluye accidentalmente en un cálculo.

**Regla:**

- El sistema excluye automáticamente las partidas monetarias.
- Muestra advertencia: "La partida [nombre] fue excluida por ser monetaria".
- Registra la exclusión en auditoría.

***

## 7. Relaciones con otros documentos

| Documento | Relación con DOMAIN.md |
|---|---|
| `PROJECT.md` | Define el problema que las reglas de negocio buscan resolver. |
| `ARCHITECTURE.md` | Proporciona la arquitectura que debe soportar estas reglas. |
| `DATABASE.md` | Modela las entidades y relaciones definidas en este documento; §4.4 y §6.1 de aquí exigen el valor `PENDIENTE_DE_CLASIFICACION` en `fiscal_items.estado`. |
| `API.md` | Expone las operaciones del dominio mediante contratos de API. |
| `SECURITY.md` | Protege el acceso a las operaciones del dominio. |
| `CONVENTIONS.md` | Establece cómo se implementan estas reglas en código. |
| `DECISIONS.md` | Registra decisiones sobre reglas controvertidas o alternativas. |
| `TODO.md` | Controla el estado de implementación de cada regla o caso de uso. |

> **Nota (2026-09-26):** los casos de prueba se definen en el Paso 04 con Vitest/Playwright (ver `CONVENTIONS.md` §7) y las fuentes normativas viven en la columna Fuente de cada regla; no existen `TEST_CASES.md` ni `TAX_RULES.md` separados.

***