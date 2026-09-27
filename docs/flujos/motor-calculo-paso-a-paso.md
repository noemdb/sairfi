# El motor de cálculo paso a paso — fórmulas y recorrido completo

> Para quien quiere entender **qué calcula el sistema, con qué fórmulas y en qué orden**, hasta llegar a la tabla de resultados.
> Dónde vive en código: `src/services/calculation/` (`adjustment-factor`, `initial-adjustment`, `regular-adjustment`, `fiscal-item.classifier`, `adjustment.consolidator`).
> Reglas: `docs/DOMAIN.md` (R-101…R-109, R-501…R-505). Los números de ejemplo son reales: ejercicio 2026 de NODO CA, verificados al centavo.

```
Partidas + Índices aprobados
  → Filtro (monetarias fuera, pendientes bloquean)
    → Por partida: factor → actualizado → ajuste
      → Suma de activos, suma de pasivos → efecto neto
        → Revisión → Aprobación (fija valores) → Reportes
```

---

## 0. Antes de calcular: lo que el sistema exige

1. **Partidas clasificadas (R-403).** Ninguna en `PENDIENTE_DE_CLASIFICACION`. Una sin fecha no frena la carga, pero sí el cálculo, y el sistema dice cuál.
2. **Índices completos y aprobados (R-404).** Hace falta el mes de compra de cada partida no monetaria **más** el mes de cierre. Si falta uno, el error nombra el mes exacto (`Índice faltante para adquisición de 12010001 (2025/01)`), nunca un genérico.
3. **Ejercicio `ABIERTO` o `REABIERTO`.** Solo esos estados admiten cálculo.

Cumplido esto, el motor separa las partidas (`fiscal-item.classifier`):

| Grupo | Qué pasa |
|---|---|
| **Calculables** (no monetarias con fecha) | Entran al cálculo |
| **Monetarias** (caja, bancos — R-001) | Excluidas con aviso, no consumen índice |
| **Sin fecha** | Ya bloqueadas en el paso 1 |

En el ejemplo NODO CA: 5 calculables + 1 monetaria (banco) excluida.

---

## 1. Las tres fórmulas base (valen para todo)

**R-101 — Factor de actualización.** Cuánto se movió la inflación entre dos meses:

```
Factor = Índice de cierre / Índice base        (8 decimales, R-502)
```

**R-102 — Valor actualizado.** La partida traída al poder adquisitivo del cierre:

```
Valor actualizado = Valor base × Factor        (2 decimales)
```

**R-103 — Ajuste individual.** Lo que ganó (o perdió) la partida contra la inflación:

```
Ajuste = Valor actualizado − Valor base        (2 decimales)
```

El redondeo se aplica al escribir el resultado, no durante las divisiones intermedias (R-504).

---

## 2. Ajuste inicial: recorrido con un ejemplo completo

Es el primer año (`calculateInitial`). Cada partida usa **su propio mes de compra** como base.

**Partida 12010001 — Maquinaria, base 100000.00, comprada 2025-01, cierre 2026-12:**

```
1. Índice base  = INPC 2025/01 = 735200.800000
   Índice cierre = INPC 2026/12 = 5958836.753674
2. Factor  = 5958836.753674 / 735200.8 = 8.10504661
3. Actualizado = 100000.00 × 8.10504661 = 810504.66
4. Ajuste  = 810504.66 − 100000.00 = 710504.66
```

El resto del ejercicio, mismo procedimiento:

| Cuenta | Base | Mes compra → cierre | Factor | Actualizado | Ajuste |
|---|---|---|---|---|---|
| 12010001 Maquinaria | 100000.00 | 2025/01 → 2026/12 | 8.10504661 | 810504.66 | 710504.66 |
| 12010002 Mobiliario | 45000.00 | 2025/03 → 2026/12 | 6.83274482 | 307473.52 | 262473.52 |
| 13010001 Inventario | 80000.00 | 2025/06 → 2026/12 | 5.29768465 | 423814.77 | 343814.77 |
| 12010003 Vehículo | 120000.00 | 2024/12 → 2026/12 | 8.73153442 | 1047784.13 | 927784.13 |
| 21010001 Préstamo (pasivo) | 60000.00 | 2025/02 → 2026/12 | 7.46300224 | 447780.13 | 387780.13 |

Fíjese en el vehículo: comprado antes (2024-12, índice más bajo) → factor mayor (8.73). Cada partida tiene su propio factor; no hay un factor único del ejercicio.

---

## 3. Consolidación: del ajuste por partida al efecto final (R-104…R-106)

```
Ajuste total activos  = suma de ajustes de ACTIVO            (R-104)
Ajuste total pasivos  = suma de ajustes de PASIVO            (R-105)
Efecto neto           = activos − pasivos                    (R-106)
```

Con el ejemplo:

```
Activos  = 710504.66 + 262473.52 + 343814.77 + 927784.13 = 2244577.08
Pasivos  = 387780.13
Efecto neto = 2244577.08 − 387780.13 = 1856796.95
```

El patrimonio **no se ajusta directamente**: recibe el efecto neto. Por eso el consolidado solo suma activos y pasivos.

---

## 4. Reajuste anual (segundo año en adelante): qué cambia

Tres diferencias respecto al inicial (`calculateRegular`, R-107…R-109):

**a) La base ya no es el valor histórico.** Es el cierre anterior actualizado (R-109, aún propuesta pendiente de firma del contador):

```
Base regular = Valor base + Ajuste acumulado
```

Ejemplo Maquinaria si 2026 hubiera cerrado con el ajuste de arriba:

```
Base = 100000.00 + 710504.66 = 810504.66
```

**b) Las partidas existentes usan el factor del período (R-107)**, no el de su compra original:

```
Factor período = INPC cierre actual / INPC cierre anterior
               = 5958836.753674 / 1956800.0 = 3.04519458
Actualizado = 810504.66 × 3.04519458 = 2468144.40
Ajuste      = 2468144.40 − 810504.66 = 1657639.74
```

**c) Cada movimiento del año se ajusta desde su propio mes (R-108)** y se pliega en la fila de su partida (una fila por partida en resultados):

```
Factor movimiento = INPC cierre / INPC mes del movimiento
Mejora 20000.00 de 2026-08: 5958836.753674 / 4107253.276737 = 1.4508082
Actualizado = 20000.00 × 1.4508082 = 29016.16 → ajuste 9016.16
```

Ese `9016.16` se suma a la base y al actualizado de la fila 12010001, no crea una fila aparte.

---

## 5. Trazabilidad: cómo se prueba que el número es reproducible

Cada cálculo guarda, congelados:

* **`version_reglas`** = `reglas@v1.0.0` (fórmulas aplicadas).
* **`version_indices`** = `inpc-sha:<12 hex>` (huella de los índices exactos usados). Mismos insumos → misma huella → mismo resultado.

Al **aprobar** (nunca antes), los valores actualizados, índices y factor se copian a cada partida y el ajuste se suma a su acumulado — en una sola transacción. Lo aprobado no se edita: un dato nuevo implica recalcular (nueva versión). Por eso la tabla de resultados muestra por partida `Base | Factor | Actualizado | Ajuste` más los dos índices: es la prueba completa del recorrido.

---

## 6. Cómo leer la tabla de resultados

| Columna | Qué es | De dónde sale |
|---|---|---|
| Base | Valor de partida del cálculo | Histórico (inicial) o base + acumulado + movimientos (regular) |
| Factor | Inflación aplicada a esa partida | §2 (por compra) o §4 (por período/movimiento) |
| Actualizado | Base × Factor | R-102 |
| Ajuste | Actualizado − Base | R-103 |

Debajo: totales de activos, de pasivos y efecto neto (§3), más `version_reglas` y `version_indices` (§5).

---

## 7. Precisión y redondeo (R-501…R-505)

* Índices: hasta 6 decimales (el INPC venezolano supera los 6 dígitos enteros; por eso la base usa `Decimal(20,6)`).
* Factores: 8 decimales.
* Dinero: 2 decimales, redondeado al persistir para que todo cuadre al centavo.
* La estrategia de redondeo es configurable por empresa (`companies.configuracion`).
