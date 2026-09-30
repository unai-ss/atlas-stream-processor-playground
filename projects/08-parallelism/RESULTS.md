# Resultados observados: laboratorio 08

Este documento resume las pruebas realizadas con el workspace ASP
`asp-lab08-gcp-us-west1`, tier `SP2`, y los processors:

- `labParallelismSerial`: `$emit.parallelism: 1`.
- `labParallelismWorkers`: `$emit.parallelism: 2`.

No es un benchmark universal. Los resultados dependen del tier, la region, el
sink Atlas, la carga previa y el momento de la medicion.

## Variante de transformacion pesada

La versión actual del processor Change Stream ejecuta veinte rondas aritméticas
dependientes de `value` y conserva solo el resultado `transform_work`. La
recurrencia de cada ronda es `resultado_anterior * 2 + número_de_ronda`.

Las salidas también conservan estos campos derivados básicos:

```text
value_squared
value_cubed
value_x10
value_plus_offset
value_score
```

Esto aumenta el trabajo del `SetOperator` sin introducir dependencias de reloj
ni expresiones no soportadas. Para localizar el coste, compara en
`operatorStats`:

```text
SetOperator.executionTimeMillis
SetOperator.latency.p50 / latency.p99
TimeseriesEmitOperator.executionTimeMillis
TimeseriesEmitOperator.latency.p50 / latency.p99
```

Si sigue dominando `TimeseriesEmitOperator`, el sink es el cuello de botella.
Si domina `SetOperator`, el paralelismo tiene más margen para mostrar una
diferencia de capacidad.

Para inspeccionar tendencias, utiliza una ventana de 30 segundos en Atlas UI
si aparece en **Granularity**. Si no está disponible, toma snapshots de
`stats()` cada 30 segundos y compara backlog y latencia. Esa cadencia muestra
tendencias, no picos subsegundo ni una garantía de muestreo exacto.

## Criterio principal

La cola se calcula asi:

```text
backlog = inputMessageCount - outputMessageCount
```

La comparacion correcta comprueba primero resultados, despues errores y por
ultimo capacidad de drenaje.

## Pruebas por lote

| Lote | Serial | Paralelo | Observacion |
|---|---:|---:|---|
| 100 eventos | 104 | 104 | Correctos; demasiado pequeno para distinguir rendimiento. |
| 1.000 eventos | 1.004 | 1.004 | Correctos; no mostro una diferencia visible de drenaje. |
| 5.000 eventos | 3.399 en una fotografia | 5.004 en la misma fotografia | El paralelo alcanzo antes el total esperado; el serial seguia drenando. |

Cada lote incluye cuatro actualizaciones, por eso el total esperado es
`eventos insertados + 4`.

La prueba de 5.000 es la primera que mostro una diferencia educativa clara.
Los valores serial/paralelo del lote de 5.000 son una fotografia durante el
procesamiento, no una medicion final tomada cuando ambos habian terminado.

## Fotografia de backlog

En una medicion posterior de carga acumulada se observo:

| Processor | Input | Output | Backlog | DLQ |
|---|---:|---:|---:|---:|
| Serial | 164.418 | 133.235 | 31.183 | 0 |
| Paralelo | 171.336 | 171.236 | 100 | 0 |

El paralelo tenia una cola casi drenada, mientras el serial acumulaba mas de
31.000 eventos. Ambos estaban en `STARTED` y no tenian errores DLQ.

## Metricas ASP observadas

En una fotografia del processor paralelo:

```text
state: STARTED
inputMessageCount: 46.332
outputMessageCount: 46.232
backlog: 100
dlqMessageCount: 0
throttleEvents: 0
```

La latencia se expresa en microsegundos. En esa ventana se observaron valores
aproximados de:

```text
p50: 193 segundos
p99: 230 segundos
```

El operador que concentraba el coste era `TimeseriesEmitOperator`, por lo que
el sink Atlas aparecia como el cuello de botella mas probable. Los operadores
`Match`, `ReplaceRoot`, `Project` y `Set` tenian un coste mucho menor.

## Como interpretar la comparacion

- `STARTED` confirma salud basica, no correccion completa.
- `inputMessageCount` confirma que el Change Stream recibe eventos.
- `outputMessageCount` confirma que los eventos terminan el pipeline.
- `dlqMessageCount: 0` confirma que no se han registrado errores de proceso.
- Un backlog creciente indica que la entrada llega mas rapido que la salida.
- `throttleEvents` y `throttledTimeMs` muestran limitacion de capacidad.
- `lastCheckpointSave` confirma que el source sigue guardando progreso.
- `memoryUsageBytes` permite observar presion de memoria con lotes grandes.

La conclusion educativa es:

> Con el mismo pipeline y el mismo sink, `parallelism: 2` dreno la carga
> acumulada mucho mejor que `parallelism: 1` en los lotes grandes. No aumento
> los errores DLQ, pero tampoco elimina los limites del sink ni garantiza orden
> global.

## Prueba sostenida de 1.000 eventos por segundo

Se preparo un seeder para enviar 1.000 eventos por segundo durante 60 segundos
con el `run_id` `run-rate-60s`. Tambien se intento una ultima ejecucion con
`run-rate-60s-final`.

Las ejecuciones sostenidas no tienen un resultado final fiable documentado
porque la salida del terminal se interrumpio antes de confirmar el resumen de
los 60.000 eventos. No deben usarse como benchmark. Para repetirla, hay que
registrar de forma controlada:

```text
60.000 eventos de entrada
output serial final
output paralelo final
DLQ de ambos
backlog al final
throttleEvents
memoryUsageBytes
latency p50 y p99
```

## Recomendacion para una prueba limpia

1. Detener y recrear ambos processors al mismo tiempo.
2. Vaciar entrada, salidas y DLQ.
3. Arrancar ambos processors.
4. Confirmar `STARTED` y contadores iniciales.
5. Ejecutar un lote con `run_id` nuevo.
6. Capturar `inputMessageCount` y `outputMessageCount` en ambos processors.
7. Esperar a que ambos alcancen el total esperado.
8. Comparar tiempo de drenaje, DLQ, throttling y memoria.
