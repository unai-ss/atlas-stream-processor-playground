# Manual laboratorio 02: Change Stream y vista de entregas

La infraestructura se prepara una sola vez en el [laboratorio 00](../00-assessment/MANUAL.md). Este manual empieza con un workspace ASP y una conexión `atlas_lab` disponibles y se concentra en crear documentos, observar cambios y materializar una vista.

## Prerrequisitos

Comprueba que existen:

- workspace ASP operativo;
- conexión Atlas `atlas_lab` en estado `READY`;
- usuario con permisos `readWrite` sobre `playground`;
- colección `playground.taco_events`.

No vuelvas a crear el cluster, el usuario ni el workspace desde este manual.

## Preflight obligatorio

Ejecuta primero este bloque en el workspace ASP. Si `atlas_lab` no aparece o
no está `READY`, detente y completa el [laboratorio 00](../00-assessment/MANUAL.md).

```javascript
sp.listConnections()
try { sp.labTacoTracking.stop() } catch (error) {}
try { sp.labTacoTracking.drop() } catch (error) {}
```

Después, en el cluster Atlas, limpia únicamente las colecciones de este
laboratorio. Esto evita que resultados antiguos contaminen los conteos o la
vista materializada:

```javascript
use playground
db.taco_events.deleteMany({})
db.taco_locations.drop()
```

Si `taco_locations` no existe, continúa. No borres el cluster, el workspace ni
colecciones de otros laboratorios.

En el cluster Atlas:

```bash
mongosh "$ATLAS_URI"
```

En el workspace ASP, conecta con su hostname mediante `mongosh` TLS.

## Paso 1: preparar la colección

En el cluster Atlas:

```javascript
use playground
db.createCollection("taco_events")
```

Si ya existe, continúa. `taco_locations` será creada por `$merge` durante la
primera ventana.

## Paso 2: cargar y arrancar el pipeline

En el workspace ASP:

```javascript
load("[local-repository]/projects/02-taco-tracking/processor.js")
sp.listStreamProcessors()
sp.labTacoTracking.start()
sp.labTacoTracking.stats()
```

El pipeline usa `fullDocument: "updateLookup"`, filtra cambios válidos y
mantiene la entrega más reciente por `delivery_id` dentro de una ventana de un
minuto.

## Paso 3: crear documentos de entrada

En el cluster Atlas, después de arrancar el processor:

```javascript
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

Cada inserción genera un evento en el Change Stream. Los documentos anteriores
al inicio del processor no se reprocesan automáticamente.

## Paso 4: observar y actualizar

En el workspace ASP:

```javascript
sp.labTacoTracking.stats()
sp.labTacoTracking.sample()
```

En el cluster Atlas, actualiza una entrega:

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

Genera después otro evento para avanzar el watermark:

```javascript
db.taco_events.updateOne(
  { delivery_id: "taco-002" },
  { $set: { timestamp: new Date() } }
)
```

## Paso 5: comprobar la vista

Después de cerrar la ventana de un minuto:

```javascript
db.taco_locations.countDocuments()
db.taco_locations.find().sort({ _id: 1 }).pretty()
db.taco_locations.findOne({ _id: "taco-001" })
```

La vista debe conservar `dist: 400` y `status: "delivered"` para `taco-001`.

## Limpieza del pipeline

En el workspace ASP:

```javascript
sp.labTacoTracking.stop()
sp.labTacoTracking.drop()
```

En el cluster Atlas, elimina las colecciones de práctica si ya no las necesitas:

```javascript
use playground
db.taco_events.drop()
db.taco_locations.drop()
```

La limpieza del workspace y del cluster pertenece al laboratorio 00 y solo debe
hacerse si los recursos son exclusivos de esta práctica.
