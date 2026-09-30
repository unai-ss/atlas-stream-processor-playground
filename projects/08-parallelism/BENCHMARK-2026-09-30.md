
## Entorno

- Workspace ASP: `asp-lab08-gcp-us-west1`
- Región: GCP `us-west1`
- Tier: `SP2`
- Processor serial: `labParallelismSerial`, `$emit.parallelism: 1`
- Processor paralelo: `labParallelismWorkers`, `$emit.parallelism: 2`
- Transformación: cálculos básicos y 20 rondas aritméticas deterministas en `SetOperator`
- DLQ: namespace distinto para cada processor

Estos son resultados educativos de una ejecución concreta, no un benchmark
universal. La carga se insertó en lotes `insertMany`; no fue un emisor con una
frecuencia fija de eventos por segundo.

## Resumen de lotes

Cada lote genera 4 actualizaciones adicionales; el total esperado en cada sink
es `eventos insertados + 4`.

| Run ID | Eventos insertados | Cambios esperados | Duración del seeder | Serial observado | Paralelo observado | DLQ |
|---|---:|---:|---:|---:|---:|---:|
| `run-transform-100` | 100 | 104 | 616 ms | 104 final | 104 final | 0 / 0 |
| `run-transform-5000` | 5.000 | 5.004 | 1.212 ms | 2.236 intermedio; 5.004 final | 4.270 intermedio; 5.004 final | 0 / 0 |
| `run-metrics-7500` | 7.500 | 7.504 | 1.438 ms | 1.440 y después 3.737 en capturas intermedias | 3.241 y después 7.387 en capturas intermedias | 0 / 0 |

Las cifras de `run-metrics-7500` son fotografías intermedias: no se guardó una
lectura final de ambos sinks para ese run. No deben interpretarse como conteos
finales.

## Métricas por operador: prueba de 100 eventos

En la ventana de Atlas Monitoring `11:07:00–11:07:30 UTC` se observaron estas
latencias de operador:

| Processor | Operador | p50 | p99 |
|---|---|---:|---:|
| Serial | `SetOperator` (cálculos básicos) | 0,311 ms | 0,311 ms |
| Serial | `SetOperator` (`transform_work`) | 0,410 ms | 0,410 ms |
| Serial | `TimeseriesEmitOperator` | 1.399,076 ms | 1.625,113 ms |
| Paralelo | `SetOperator` (cálculos básicos) | 0,340 ms | 0,340 ms |
| Paralelo | `SetOperator` (`transform_work`) | 0,340 ms | 0,340 ms |
| Paralelo | `TimeseriesEmitOperator` | 1.189,947 ms | 1.422,222 ms |

La muestra pequeña sirve para verificar funcionalidad, pero no demuestra una
ventaja de rendimiento fiable. En esa ventana el coste medido del sink fue muy
superior al de la transformación.

## Backlog y carga acumulada

Una fotografía anterior de métricas globales registró:

| Processor | Input | Output | Backlog | DLQ | Memoria |
|---|---:|---:|---:|---:|---:|
| Serial | 164.418 | 133.235 | 31.183 | 0 | 310.378.496 bytes |
| Paralelo | 171.336 | 171.236 | 100 | 0 | 261.095.424 bytes |

El backlog se calcula como:

```text
backlog = inputMessageCount - outputMessageCount
```

Esta fotografía muestra que el paralelo drenaba mucho más cerca de la entrada.
Los contadores globales incluían carga previa, así que no representan solo uno
de los lotes descritos arriba.

## Conclusiones

- Los lotes de 100 y 5.000 terminaron con salidas correctas y DLQ en cero.
- En el lote de 5.000, una fotografía intermedia mostró al paralelo por delante;
  ambos llegaron después a 5.004 documentos.
- En el lote de 7.500 también se observó al paralelo por delante durante el
  drenaje, pero falta una fotografía final de ese run.
- La diferencia de capacidad fue más visible en lotes grandes y con cola
  acumulada.
- `TimeseriesEmitOperator` mostró más latencia que `SetOperator` en la muestra
  de 100 eventos; el sink parece ser un cuello de botella importante.
- `DLQ = 0` y `throttleEvents = 0` en las fotografías registradas.
- Las latencias de 30 segundos solo son comparables si ambos processors se
  capturan en la misma ventana temporal. Algunas lecturas anteriores usaron
  ventanas distintas y no se usan para una comparación directa.

## Límite de la prueba sostenida

La ejecución de 1.000 eventos/s durante 60 segundos no produjo un resumen final
fiable en la terminal. No se considera un benchmark válido de 60.000 eventos.

## Siguiente repetición recomendada

1. Recrear ambos processors al mismo tiempo para que empiecen desde checkpoints
   nuevos.
2. Limpiar entrada, salidas y DLQ antes de cada corrida.
3. Ejecutar un `run_id` único.
4. Tomar snapshots de ambos processors en los mismos intervalos de 30 segundos.
5. Registrar `inputMessageCount`, `outputMessageCount`, backlog, DLQ,
   `SetOperator` y `TimeseriesEmitOperator` p50/p99, throttling y memoria.
6. Considerar el resultado final solo cuando ambos sinks alcancen el total
   esperado y los dos DLQ sigan en cero.
