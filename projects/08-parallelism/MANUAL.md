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
| Processor serial | `labParallelismSerial` |
| Processor paralelo | `labParallelismWorkers` |
| Lote inicial | `run-001`, 100 inserciones y 4 actualizaciones |

## Paso 0: preparar el entorno

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

Este manual usa el mismo workspace y cluster de pruebas que el resto del
playground. No imprime ni modifica credenciales.

## Paso 1: limpiar una ejecucion anterior

En una sesion `mongosh` conectada al cluster Atlas:

```javascript
use playground

db.parallelism_input.deleteMany({})
db.parallelism_serial_output.deleteMany({})
db.parallelism_parallel_output.deleteMany({})
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
4 actualizaciones. Comprueba también que `value_squared` coincide con `value`
y que `change_version: 2` aparece para las cuatro entidades.

El resultado demuestra que ambos processors pueden recibir el mismo flujo de
cambios. No demuestra que `$emit.parallelism: 2` sea siempre más rápido ni que
conserve orden global. El rendimiento depende del workspace, la red, el sink y
el volumen.

## Paso 5: repetir el experimento

Para cambiar el tamaño del lote, edita temporalmente `eventCount` y `runId` en
`[08-seed-parallelism.js](../../scripts/08-seed-parallelism.js)`. Usa un `runId`
distinto en cada ejecución y limpia las colecciones antes de repetirla.

Registra como mínimo:

| Medida | Observación |
|---|---|
| Eventos insertados | Tamaño del lote del seeder |
| Eventos por salida | Conteo filtrado por `run_id` |
| Errores | `stats()` y logs/DLQ si aparecen |
| Duración | Hora de inicio y fin del seeder |
| Throughput aproximado | Eventos de salida dividido por duración |
| Orden | Comparación por `entity_id` y `sequence` |

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
```

No elimines el workspace ni el cluster compartido desde este manual salvo que
sean recursos creados exclusivamente para esta ejecución.
