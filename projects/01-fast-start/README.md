# Laboratorio 01: primer flujo con Sample

Autor de la referencia: Kenny Gorman.

Fuente: https://medium.com/mongodb/the-fastest-way-to-try-atlas-stream-processing-43cd7e0cfe1e

Documentacion oficial relacionada: https://www.mongodb.com/docs/atlas/atlas-stream-processing/quickstart

**Descripcion:** Observa eventos de `sample_stream_solar` y aprende a crear un
processor persistente que los escribe en una coleccion Atlas.

## Objetivo

Completar el primer flujo de Atlas Stream Processing en dos pasos: comprobar
que una fuente emite eventos y despues persistir esos eventos en una coleccion
Atlas mediante un processor administrado.

## Conceptos ASP

- conexion `Sample` y etapa `$source`;
- inspeccion temporal con `sp.process()`;
- processor persistente y ciclo de vida `start`, `stats`, `sample`, `stop` y `drop`;
- normalizacion de `timestamp` antes de escribir en una coleccion time-series;
- etapa `$emit` hacia un sink Atlas.

## Arquitectura

```text
sample_stream_solar
		-> $source
		-> $set (timestamp)
		-> $emit
		-> playground.fast_start_events
```

## Preparacion

El workspace de Stream Processing suele incluir la conexion `Sample`
`sample_stream_solar`. Si no aparece en `sp.listConnections()`, registrala
antes de continuar.

Necesitas:

- un Stream Processing Workspace de pruebas;
- acceso a ese workspace con `mongosh`;
- `mongosh` version 2.0 o posterior;
- una conexion Atlas llamada `atlas_lab`;
- la coleccion `playground.fast_start_events` preparada como time-series con
	`timestamp` como `timeField`.

El primer paso no requiere cargar el archivo `processor.js`.

## Paso 1: observar la fuente

Conectado al Stream Processing Workspace, ejecuta un processor temporal:

```javascript
sp.process([
	{
		$source: {
			connectionName: "sample_stream_solar"
		}
	}
])
```

Deberias ver documentos similares a:

```javascript
{
	device_id: "device_8",
	group_id: 7,
	timestamp: "2024-08-12T21:41:01.788+00:00",
	max_watts: 450,
	event_type: 0,
	obs: { watts: 252, temp: 17 }
}
```

Termina la ejecucion temporal con `Ctrl-C`. Este processor no se guarda en el
workspace y no crea recursos persistentes.

## Paso 2: crear el processor persistente

Carga la definicion desde `mongosh` conectado al workspace:

```javascript
load("projects/01-fast-start/processor.js")
```

El archivo crea `labFastStart` con estas etapas:

1. `$source` lee `sample_stream_solar`.
2. `$set` convierte el timestamp ISO de Sample a una fecha y usa un fallback
	fijo solo si falta o no se puede convertir.
3. `$emit` escribe en `playground.fast_start_events` mediante `atlas_lab`.

Inicia y observa el processor:

```javascript
sp.labFastStart.start()
sp.labFastStart.stats()
sp.labFastStart.sample()
```

`stats()` confirma actividad operacional y `sample()` muestra una muestra de
documentos procesados en la consola.

## Verificacion del sink

Desde una conexion al cluster Atlas, comprueba que llegaron documentos:

```javascript
use playground
db.fast_start_events.findOne()
```

La salida debe contener un `timestamp` de tipo fecha y los campos del evento
Sample, como `device_id`, `obs.watts` y `obs.temp`:

```javascript
db.fast_start_events.findOne({ timestamp: { $type: "date" } })
db.fast_start_events.countDocuments()
```

El contador debe ser mayor que cero y el timestamp debe corresponder al evento
recibido, salvo en mensajes sin timestamp valido.

## Limpieza

Cuando termines la practica, detiene y elimina el processor persistente:

```javascript
sp.labFastStart.stop()
sp.labFastStart.drop()
sp.listStreamProcessors()
```

`drop()` es permanente. La coleccion sink y el workspace se eliminan siguiendo
la limpieza general descrita en [ASP_OPERATIONS_GUIDE.md](../../ASP_OPERATIONS_GUIDE.md).

## Ejercicio opcional

Modifica el pipeline para conservar solo eventos cuyo `obs.watts` sea mayor que
200. Comprueba con `sample()` y con una consulta al sink que el filtro se aplica.

Este laboratorio es una adaptacion local del articulo; no es codigo oficial del autor.
