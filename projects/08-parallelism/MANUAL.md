# Manual laboratorio 08: paralelismo reproducible con Change Stream

Este manual ejecuta el modo reproducible del laboratorio 08. A diferencia del
modo Sample, escribe un lote controlado en `playground.parallelism_input` y
hace que dos processors lean los mismos cambios:

```text
parallelism_input Change Stream
        |-----------------> labParallelismSerial  -> parallelism: 1
        |
        +-----------------> labParallelismWorkers -> parallelism: 2
```

Usa un proyecto Atlas de pruebas. No ejecutes el laboratorio contra datos de
produccion ni guardes contrasenas, URIs o evidencias sin redactar en Git.

## Recursos

| Recurso | Nombre |
|---|---|
| Conexion de entrada | `atlas_lab` |
| Coleccion de entrada | `playground.parallelism_input` |
| Salida serial | `playground.parallelism_serial_output` |
| Salida paralela | `playground.parallelism_parallel_output` |
| DLQ serial | `playground.parallelism_serial_dlq` |
| DLQ paralelo | `playground.parallelism_parallel_dlq` |
| Processor serial | `labParallelismSerial` |
| Processor paralelo | `labParallelismWorkers` |
| Lote inicial | `run-001`, 100 inserciones y 4 actualizaciones |

## Paso 0: preparar el entorno

Registra la sesión del Atlas CLI desde la consola con `atlas auth login` y
confirma que está activa con `atlas auth whoami`. Si la sesión ha caducado,
ejecuta de nuevo `atlas auth login`.

```bash
cd [local-repository]
source .env
atlas auth whoami
mongosh "$ATLAS_URI"
```

Necesitas un workspace ASP activo, una conexion `atlas_lab` en estado `READY`,
y un usuario de base de datos con permisos de lectura y escritura sobre
`playground`. La guia general de workspace esta en
[ASP_OPERATIONS_GUIDE.md](../../ASP_OPERATIONS_GUIDE.md).

Si el workspace, el cluster o `atlas_lab` no están disponibles, detente y
completa primero el [laboratorio 00](../00-assessment/MANUAL.md). Este manual no
crea ni elimina infraestructura compartida.

Este manual usa el mismo workspace y cluster de pruebas que el resto del
playground. No imprime ni modifica credenciales.

Desde la raíz del proyecto, valida la URI antes de conectarte al cluster:

```bash
./scripts/validate-atlas-connection.sh
```

## Paso 1: limpiar una ejecucion anterior

En una sesion `mongosh` conectada al cluster Atlas:

```javascript
use playground

db.parallelism_input.deleteMany({})
db.parallelism_serial_output.deleteMany({})
db.parallelism_parallel_output.deleteMany({})
db.parallelism_serial_dlq.deleteMany({})
db.parallelism_parallel_dlq.deleteMany({})

db.createCollection("parallelism_serial_dlq")
db.createCollection("parallelism_parallel_dlq")
```

En otra sesion `mongosh`, conectada al hostname del workspace ASP, detén y
elimina processors anteriores si existen:

```javascript
sp.labParallelismSerial.stop()
sp.labParallelismWorkers.stop()
sp.labParallelismSerial.drop()
sp.labParallelismWorkers.drop()
```

Si alguno no existe, continua con el siguiente comando.

## Paso 2: cargar y arrancar los processors

En la sesion del workspace ASP:

```javascript
load("[local-repository]/projects/08-parallelism/processor-change-stream.js")

sp.listStreamProcessors()
sp.labParallelismSerial.start()
sp.labParallelismWorkers.start()
sp.labParallelismSerial.stats()
sp.labParallelismWorkers.stats()
```

Los dos processors deben estar en estado `STARTED` antes de insertar datos.
Arrancarlos antes es esencial: los cambios anteriores al inicio no forman
parte de la comparacion reproducible.

La variante de transformación actual añade 20 rondas aritméticas dependientes
del valor (`multiplicar por 2 y sumar el índice de ronda`). El resultado queda
en `transform_work`; no se conservan los intermediarios para evitar aumentar el
tamaño del documento de salida. Al cambiar esta definición, elimina y recrea
los processors para que ASP cargue el pipeline nuevo.

## Paso 3: insertar el lote controlado

En la sesion conectada al cluster Atlas, ejecuta:

```javascript
load("[local-repository]/scripts/08-seed-parallelism.js")
```

El seeder inserta 100 documentos con cuatro entidades y despues actualiza el
primer evento de cada entidad. Todos los documentos llevan:

- `run_id` para aislar la ejecucion;
- `entity_id` para agrupar eventos relacionados;
- `sequence` para revisar orden y huecos;
- `partition_key` para discutir afinidad;
- `change_version` para distinguir inserciones de actualizaciones.

## Paso 4: observar y validar

En el workspace ASP:

```javascript
sp.labParallelismSerial.stats()
sp.labParallelismWorkers.stats()
sp.labParallelismSerial.sample()
sp.labParallelismWorkers.sample()
```

## Metricas que debes registrar

Para cada processor y para cada tamaño de lote, anota estos valores de
`stats()`:

| Metrica | Interpretacion |
|---|---|
| `state` | Debe ser `STARTED` antes y durante la prueba. |
| `inputMessageCount` | Confirma que el Change Stream recibió los cambios. |
| `outputMessageCount` | Confirma que los eventos completaron el pipeline. |
| `dlqMessageCount` | Debe ser `0`; si aumenta, consulta el namespace DLQ. |
| `lastMessageIn` | Marca cuándo llegó el último cambio. |
| `lastCheckpointSave` | Indica que el progreso del source se guardó. |
| `throttle.throttleEvents` | Señala limitación de capacidad o backpressure. |
| `memoryUsageBytes` | Permite observar crecimiento de memoria con el volumen. |

La lectura mínima correcta es:

```text
STARTED + input creciente + output creciente + DLQ 0
```

Un processor puede estar `STARTED` y aun así ser incorrecto si
`outputMessageCount` permanece en cero o `dlqMessageCount` aumenta.

## Observar métricas cada 30 segundos

En Atlas UI, abre **Stream Processing > Monitoring**, selecciona ambos
processors y limita el intervalo de tiempo a la prueba. Si el menú
**Granularity** ofrece `30 seconds`, selecciónalo. Si no ofrece exactamente
30 segundos, no asumas esa granularidad: toma snapshots de `stats()` a mano o
consulta la Admin API cada 30 segundos desde una terminal.

Registra en cada snapshot:

```text
hora local, processor, inputMessageCount, outputMessageCount,
backlog (input - output), dlqMessageCount,
SetOperator p50/p99, TimeseriesEmitOperator p50/p99,
throttleEvents, memoryUsageBytes
```

Compara la pendiente de `SetOperator` con la de `TimeseriesEmitOperator`.
Si sube el coste de `SetOperator`, la transformación está ocupando más tiempo;
si domina `TimeseriesEmitOperator`, el sink sigue siendo el cuello de botella.
Una granularidad de 30 segundos permite ver tendencias, pero puede ocultar
picos que ocurren entre muestras.

En el cluster Atlas:

```javascript
use playground

const runId = "run-001";

db.parallelism_serial_output.countDocuments({ run_id: runId })
db.parallelism_parallel_output.countDocuments({ run_id: runId })

db.parallelism_serial_output
  .find({ run_id: runId })
  .sort({ entity_id: 1, sequence: 1, change_version: 1 })
  .toArray()

db.parallelism_parallel_output
  .find({ run_id: runId })
  .sort({ entity_id: 1, sequence: 1, change_version: 1 })
  .toArray()
```

La expectativa educativa es observar 104 cambios por salida: 100 inserciones y
4 actualizaciones. Comprueba también que `value_squared`, `value_cubed`,
`value_x10`, `value_plus_offset` y `value_score` son coherentes con `value`, y
que `change_version: 2` aparece para las cuatro entidades.

Comprueba que no hubo errores:

```javascript
db.parallelism_serial_dlq.countDocuments()
db.parallelism_parallel_dlq.countDocuments()
```

Ambos valores deben ser `0`. Si alguno es mayor que cero, revisa un documento
con `findOne()` y busca `errInfo.reason`, `operatorName` y `doc`.

El resultado demuestra que ambos processors pueden recibir el mismo flujo de
cambios. No demuestra que `$emit.parallelism: 2` sea siempre más rápido ni que
conserve orden global. El rendimiento depende del workspace, la red, el sink y
el volumen.

La transformación usa varias operaciones aritméticas deterministas para dar
más trabajo al `SetOperator`. No usa `$$NOW` ni otras expresiones no soportadas
por este entorno ASP. Compara `SetOperator` y `TimeseriesEmitOperator` en
`operatorStats`: si domina `SetOperator`, la carga está en la transformación;
si domina `TimeseriesEmitOperator`, el cuello de botella está en el sink.

## Paso 5: comparar tres tamaños

El seeder acepta `SEED_EVENT_COUNT` y `SEED_RUN_ID`, por lo que no necesitas
editar el archivo. Ejecuta cada tamaño en el cluster Atlas, con los processors
activos:

Antes de empezar una nueva comparación, limpia una vez los datos de ejecuciones
anteriores. No ejecutes esta limpieza entre los tres tamaños:

```javascript
use playground
db.parallelism_input.deleteMany({})
db.parallelism_serial_output.deleteMany({})
db.parallelism_parallel_output.deleteMany({})
db.parallelism_serial_dlq.deleteMany({})
db.parallelism_parallel_dlq.deleteMany({})
```

```javascript
SEED_EVENT_COUNT = 100
SEED_RUN_ID = "run-100"
load("[local-repository]/scripts/08-seed-parallelism.js")
```

```javascript
SEED_EVENT_COUNT = 1000
SEED_RUN_ID = "run-1000"
load("[local-repository]/scripts/08-seed-parallelism.js")
```

```javascript
SEED_EVENT_COUNT = 5000
SEED_RUN_ID = "run-5000"
load("[local-repository]/scripts/08-seed-parallelism.js")
```

Cada lote genera además cuatro actualizaciones, así que los cambios esperados
son 104, 1.004 y 5.004 respectivamente. Usa un `run_id` distinto y no limpies
la entrada entre lotes; así puedes comparar las ejecuciones en las mismas
colecciones. El seeder imprime `startedAt`, `finishedAt` y
`seedDurationMs`; anótalos junto con una marca local del momento en que cada
processor alcanza el contador esperado.

Puedes tomar la marca local en la consola del cluster antes y después de la
consulta de cada salida:

```javascript
const measuredAt = new Date();
printjson({ measuredAt });
```

Para una medición aproximada del procesamiento, registra:

```text
localStartAt       = momento justo antes de cargar el seeder
localInputFinished = finishedAt que imprime el seeder
localSerialDone    = momento en que la salida serial alcanza expected
localParallelDone  = momento en que la salida paralela alcanza expected
```

Calcula por separado:

```text
seedDuration       = finishedAt - startedAt
serialEndToEnd     = localSerialDone - localStartAt
parallelEndToEnd   = localParallelDone - localStartAt
serialDrainTime    = localSerialDone - localInputFinished
parallelDrainTime  = localParallelDone - localInputFinished
```

Estas son mediciones locales educativas, no métricas oficiales de latencia de
Atlas. Usa el mismo equipo, workspace, región y orden de ejecución para que la
comparación sea razonable.

Consulta el resumen después de que el procesamiento termine:

```javascript
[
  { run_id: "run-100", expected: 104 },
  { run_id: "run-1000", expected: 1004 },
  { run_id: "run-5000", expected: 5004 }
].forEach(({ run_id, expected }) => {
  printjson({
    run_id,
    expected,
    serial: db.parallelism_serial_output.countDocuments({ run_id }),
    parallel: db.parallelism_parallel_output.countDocuments({ run_id })
  });
});
```

Calcula el throughput de cada salida con:

```text
throughput = eventos procesados / segundos hasta alcanzar el contador esperado
```

Compara siempre en este orden: resultados correctos, errores DLQ y finalmente
throughput. No uses solo la duración del seeder, porque mide la escritura de
entrada y no el tiempo completo del procesamiento ASP.

### Nota de la prueba realizada

En este entorno, los lotes pequeños de 100 y 1.000 eventos sirvieron para
validar la corrección, pero no mostraron una diferencia clara de rendimiento.
El lote de 5.000 fue el primero suficientemente grande para hacer visible la
diferencia: el processor con `parallelism: 2` alcanzó antes los `5.004` cambios,
mientras el processor con `parallelism: 1` todavía estaba drenando eventos.

La observación depende del tier, región, sink y carga del workspace; no es un
benchmark universal.

Consulta el resumen:

```javascript
use playground

[
  { run_id: "run-100", expected: 104 },
  { run_id: "run-1000", expected: 1004 },
  { run_id: "run-5000", expected: 5004 }
].forEach(({ run_id, expected }) => {
  printjson({
    run_id,
    expected,
    serial: db.parallelism_serial_output.countDocuments({ run_id }),
    parallel: db.parallelism_parallel_output.countDocuments({ run_id })
  });
});
```

Registra la hora de inicio y fin de cada carga para calcular el throughput de
cada processor. Compara primero que los resultados sean correctos y después el
rendimiento; un lote pequeño puede no mostrar ninguna ventaja.

Registra como mínimo:

| Medida | Observación |
|---|---|
| Eventos insertados | Tamaño del lote del seeder |
| Eventos por salida | Conteo filtrado por `run_id` |
| Errores | `stats()` y logs/DLQ si aparecen |
| Duración | Hora de inicio y fin del seeder |
| Throughput aproximado | Eventos de salida dividido por duración |
| Orden | Comparación por `entity_id` y `sequence` |

Para comparar rendimiento, registra también `lastMessageIn` y la hora en la
que cada salida alcanza su contador esperado. Calcula el throughput de cada
processor con el mismo intervalo de medición:

```text
throughput = eventos de salida / segundos transcurridos
```

Observa estas tendencias:

- `inputMessageCount` debe aumentar de forma parecida en ambos processors;
- `outputMessageCount` debe alcanzar el mismo total esperado;
- `dlqMessageCount` debe permanecer en cero;
- `throttleEvents` puede explicar por qué añadir workers no mejora el tiempo;
- `memoryUsageBytes` puede crecer con lotes mayores;
- `lastCheckpointSave` debe avanzar mientras el source progresa.

## Diagnóstico rápido

| Síntoma | Comprobación |
|---|---|
| No hay salida | Confirma `STARTED`, `atlas_lab` en `READY` y que el seeder se ejecutó después. |
| Hay menos documentos | Revisa filtros, `run_id`, DLQ y que ambos processors estuvieran activos. |
| No aparecen actualizaciones | Comprueba `fullDocument: "updateLookup"` y `change_version: 2`. |
| Mismo rendimiento | Aumenta el lote; un lote pequeño o el sink puede ocultar la diferencia. |
| Orden diferente | Agrupa por entidad; no asumas orden global con `$emit.parallelism`. |

## Limpieza

En el workspace ASP:

```javascript
sp.labParallelismSerial.stop()
sp.labParallelismWorkers.stop()
sp.labParallelismSerial.drop()
sp.labParallelismWorkers.drop()
```

En el cluster Atlas:

```javascript
use playground
db.parallelism_input.drop()
db.parallelism_serial_output.drop()
db.parallelism_parallel_output.drop()
db.parallelism_serial_dlq.drop()
db.parallelism_parallel_dlq.drop()
```

No elimines el workspace ni el cluster compartido desde este manual salvo que
sean recursos creados exclusivamente para esta ejecución.
