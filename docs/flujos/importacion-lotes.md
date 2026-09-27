# Cargar datos por Excel (partidas, movimientos e índices)

> Guía para el usuario: cómo traer muchos datos a la vez sin transcribir a mano.

```
Descargue la plantilla → Llénela → Súbala → Revise el resumen
→ Descargue los errores → Corrija y reintente solo esas filas
```

---

## 1. Qué puede cargar

- **Partidas:** bienes, deudas y patrimonio (cuenta, nombre, tipo, clasificación, categoría, fecha de compra, valor, vida útil si aplica).
- **Movimientos del año:** compras, mejoras, depreciaciones, ventas, bajas, pagos, aportes, etc. Se identifican por la cuenta a la que pertenecen.
- **Índices de inflación:** año, mes, valor y fuente (carga por CSV).

Use siempre la plantilla oficial que le entrega el sistema: trae solo los encabezados válidos.

---

## 2. Quién y qué necesita

**Quién:** Analista o Contador.

**Requisitos:**

- Tener el ejercicio creado (normalmente ya abierto).
- Archivo Excel o CSV, de tamaño moderado (si es muy pesado, divídalo).
- Respetar los encabezados de la plantilla; no cambie nombres de columnas.

---

## 3. Cómo funciona la carga

1. Suba el archivo en la opción de importación del ejercicio, indicando qué trae (partidas o movimientos).
2. El sistema revisa fila por fila en una sola pasada:
   - Si la fila está bien, la guarda.
   - Si está duplicada (ya había entrado), la cuenta como duplicada y no la repite.
   - Si tiene un error, la aparta y le explica el motivo en esa misma fila.
3. Al terminar le muestra un resumen: cuántas filas entraron, cuántas tenían error y cuántas ya estaban.

No hay paso intermedio de vista previa: lo válido queda guardado de una vez y lo malo queda claramente señalado para corregir.

---

## 4. Errores frecuentes y cómo corregirlos

- **Falta la fecha de compra en un bien no monetario:** la fila entra pero la partida queda “pendiente de clasificación” hasta que el Contador la complete. No entra al cálculo mientras tanto.
- **Partida monetaria (caja, bancos, por cobrar/pagar):** entra bien, pero el sistema la excluirá del cálculo y se lo avisará.
- **Valor negativo o fecha fuera del año:** se rechaza esa fila; corríjala en el Excel.
- **Venta o baja mayor que el saldo:** se rechaza; el sistema le muestra el saldo disponible.
- **Encabezados cambiados o archivo no válido:** se rechaza la carga completa; descargue de nuevo la plantilla.

Descargue el archivo de errores, corrija solo esas filas y vuelva a subirlas: **lo que ya entró no se duplica**.

---

## 5. Qué obtiene al final

- Datos cargados y listos para clasificar y calcular.
- Un registro del lote (cuándo se cargó, quién lo hizo, cuántas filas entraron y cuáles fallaron).
- El archivo original guardado como respaldo.
- Todo el proceso anotado en la bitácora.

Con una carga típica de más de cien filas con algunos errores mezclados, el resumen le dice exactamente qué entró, qué falló y por qué.
