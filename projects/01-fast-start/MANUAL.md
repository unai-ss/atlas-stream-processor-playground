# Manual laboratorio 01: primer pipeline con Sample

La infraestructura se crea una sola vez en el [manual del laboratorio 00](../00-assessment/MANUAL.md). Este manual empieza con un workspace ASP ya disponible y se concentra en cargar, ejecutar y observar el pipeline.

## Prerrequisitos

Comprueba que existen:

- workspace ASP en estado operativo;
- conexion `sample_stream_solar`;
- conexion Atlas `atlas_lab`;
- coleccion o permisos para crear `playground.fast_start_events`.

En el workspace ASP:

```javascript
sp.listConnections()
```

En el cluster Atlas:

```bash
mongosh "$ATLAS_URI"
```

No vuelvas a crear el cluster, el usuario ni el workspace desde este manual.

## Preflight obligatorio

En el workspace ASP confirma las conexiones y elimina una ejecución anterior:

```javascript
sp.listConnections()
try { sp.labFastStart.stop() } catch (error) {}
try { sp.labFastStart.drop() } catch (error) {}
```

En el cluster Atlas, limpia únicamente el sink del laboratorio:

```javascript
use playground
db.fast_start_events.deleteMany({})
```

Si falta `sample_stream_solar`, `atlas_lab` o el workspace no está operativo,
detente y completa el [laboratorio 00](../00-assessment/MANUAL.md).

## Paso 1: observar la fuente

Conectado al workspace ASP:

```javascript
sp.process([
  {
    $source: {
      connectionName: "sample_stream_solar"
    }
  }
])
```

Observa la forma de los documentos y termina la ejecución temporal con `Ctrl-C`.

## Paso 2: cargar el pipeline

```javascript
load("[local-repository]/projects/01-fast-start/processor.js")
sp.listStreamProcessors()
```

`load()` ejecuta el archivo local en `mongosh`; `sp.createStreamProcessor()`
registra el pipeline como `labFastStart`.

## Paso 3: iniciar y observar

```javascript
sp.labFastStart.start()
sp.labFastStart.stats()
sp.labFastStart.sample()
```

Comprueba el estado del processor y observa cómo `$set` normaliza `timestamp`
antes de que `$emit` escriba en Atlas.

## Paso 4: comprobar documentos en Atlas

```javascript
use playground
db.fast_start_events.countDocuments()
db.fast_start_events.findOne({ timestamp: { $type: "date" } })
```

El resultado debe contener `timestamp`, `device_id`, `obs.watts` y `obs.temp`.

## Ejercicio

Añade temporalmente un `$match` que conserve solo eventos con `obs.watts`
mayor que 200. Usa `sample()` y consulta el sink para comprobar el efecto.

## Limpieza del pipeline

```javascript
sp.labFastStart.stop()
sp.labFastStart.drop()
```

La limpieza del workspace y del cluster pertenece al laboratorio 00 y no debe
hacerse desde este manual salvo que los recursos sean exclusivos de la práctica.
