# Sensor join with late data repair

Autor de la referencia: Joseph Niemiec.

Fuente: https://medium.com/mongodb/joins-with-late-data-handling-in-atlas-stream-processing-28219d365714

**Descripcion:** Une temperatura y humedad desde Kafka usando ventanas y
lateness controlada, y repara resultados tardios mediante una coleccion DLQ.

## Preparacion

Registra una conexion Kafka llamada `kafka_lab` con los topics `temperature` y `humidity`. Registra `atlas_lab` y crea las colecciones `playground.sensor_weather` y `playground.sensor_dlq`.

## Ejecucion

```javascript
load('projects/04-late-data-join/processor.js')
sp.sensorJoins.start()
sp.sensorDLQUpdater.start()
sp.sensorJoins.stats()
```

El primer processor une temperatura y humedad en ventanas de 30 segundos, acepta cinco segundos de lateness y envia eventos tardios al DLQ. El segundo repara el materialized view desde ese DLQ.

Este laboratorio conserva el patron del articulo y requiere Kafka para probar lateness real.
