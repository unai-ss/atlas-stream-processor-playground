# Laboratorio 02: vista de entregas con Change Streams

Autor de la referencia: Kenny Gorman.

Fuente: https://medium.com/mongodb/locating-tacos-with-atlas-stream-processing-or-streaming-etl-with-mongodb-8b43b4d6ae54

**Descripcion:** Lee cambios de `taco_events`, agrupa las entregas en ventanas
y mantiene una vista materializada con la posicion mas reciente.

## Objetivo

Transformar cambios de una coleccion Atlas en una vista materializada con la
ultima posicion conocida de cada entrega.

## Conceptos ASP

- `$source` con una conexion Atlas y Change Streams;
- `fullDocument: "updateLookup"` para recuperar el documento posterior en
	eventos `update`;
- filtrado de operaciones `insert`, `update` y `replace`;
- ventanas `$tumblingWindow`;
- seleccion del evento mas reciente con `$top`;
- `$merge` para mantener una vista por `delivery_id`.

## Arquitectura
		-> ventana de 1 minuto
		-> $group por delivery_id
		-> $top por timestamp
		-> $merge
		-> playground.taco_locations
```

## Preparacion

Necesitas:

- el mismo workspace ASP y la conexion Atlas `atlas_lab` del laboratorio 01;
- un cluster Atlas de pruebas;
- acceso al workspace y al cluster con `mongosh`;
- la coleccion `playground.taco_events`.

Para conectarte al cluster Atlas usa la URI completa, que incluye las
credenciales de `stream[redacted]`:

```bash
mongosh "$ATLAS_URI"
```

Para conectarte al workspace ASP usa su hostname `ASP_HOST`; es un endpoint
distinto del cluster Atlas.
Antes de crear el cluster, sigue el [manual operativo del laboratorio](MANUAL.md)
desde el paso 0. El manual lista todos los clusters del proyecto, no solo
`Cluster0`, y pide confirmacion explicita antes de borrarlos.

`$merge` puede crear `playground.taco_locations` durante la primera ventana.

## Paso 1: generar eventos
use playground

db.taco_events.insertOne({
	delivery_id: "taco-001",
	dist: 1200,
	timestamp: new Date(),
	status: "on_route"
})

db.taco_events.insertOne({
	delivery_id: "taco-002",
	dist: 850,
	timestamp: new Date(),
	status: "preparing"
})
```

Cada insercion produce un evento en el Change Stream. Los documentos existentes
antes de iniciar el processor no se reprocesan automaticamente.

## Paso 2: observar el Change Stream

Antes del processor persistente, conecta `mongosh` al workspace ASP y ejecuta:

```javascript
sp.process([
	{
		$source: {
			connectionName: "atlas_lab",
			db: "playground",
			coll: "taco_events",
			config: { fullDocument: "updateLookup" }
		}
	}
])
```

Mientras el comando esta activo, inserta otro evento y observa su
`operationType` y `fullDocument`. Termina el processor temporal con `Ctrl-C`.

## Paso 3: crear la vista materializada

Conecta de nuevo al workspace ASP y carga el processor:

```javascript
load("[local-repository]/projects/02-taco-tracking/processor.js")
sp.labTacoTracking.start()
sp.labTacoTracking.stats()
sp.labTacoTracking.sample()
```

El processor agrupa cada minuto y conserva, para cada `delivery_id`, el evento
con el timestamp mas reciente dentro de la ventana.

Al recrear un processor, los eventos anteriores a su inicio no se reprocesan.
Usa eventos nuevos para la prueba. La ventana se emite cuando el watermark
avanza a una ventana posterior; si no hay eventos posteriores, la salida puede
seguir mostrando el estado de la ventana anterior.

## Paso 4: cambiar una entrega

Actualiza una entrega desde el cluster Atlas:

```javascript
db.taco_events.updateOne(
	{ delivery_id: "taco-001" },
	{
		$set: {
			dist: 400,
			timestamp: new Date(),
			status: "delivered"
		}
	}
)
```

Cuando haya comenzado el minuto siguiente, genera un evento posterior para
avanzar el watermark:

```javascript
db.taco_events.updateOne(
	{ delivery_id: "taco-002" },
	{ $set: { timestamp: new Date() } }
)
```

Los documentos sin `delivery_id` o sin `timestamp` de tipo fecha se descartan
para evitar una salida con `_id: null`.

Tras cerrar la ventana de un minuto, consulta la vista:

```javascript
db.taco_locations.find().sort({ _id: 1 }).pretty()
```

Debe existir un documento por entrega, con `dist`, `updated_at` y `status`.

## Verificacion

Comprueba que la vista contiene el estado mas reciente:

```javascript
db.taco_locations.countDocuments()
db.taco_locations.findOne({ _id: "taco-001" })
```

El contador debe ser mayor que cero y `taco-001` debe mostrar `dist: 400` y
`status: "delivered"` despues de que la ventana haya terminado.

## Limpieza

Desde el workspace ASP:

```javascript
sp.labTacoTracking.stop()
sp.labTacoTracking.drop()
sp.listStreamProcessors()
```

Desde el cluster Atlas, elimina las colecciones de practica si ya no las
necesitas:

```javascript
use playground
db.taco_events.drop()
db.taco_locations.drop()
```

## Ejercicios opcionales

1. Cambia la ventana de un minuto a diez segundos.
2. Ignora entregas con `status: "cancelled"`.
3. Añade un contador de eventos por entrega.
4. Inserta un evento con un timestamp antiguo y observa por que `$top` no lo
	 selecciona como el estado mas reciente.

Este laboratorio es una adaptacion local del articulo; no es codigo oficial del autor.
