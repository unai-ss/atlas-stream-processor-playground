# Sensor join with late data repair

Autor de la referencia: Joseph Niemiec.

Fuente: https://medium.com/mongodb/joins-with-late-data-handling-in-atlas-stream-processing-28219d365714

**Descripcion:** Une temperatura y humedad desde Kafka usando ventanas y
lateness controlada, y repara resultados tardios mediante una coleccion DLQ.

## Preparacion

Antes de usar `ATLAS_URI`, ejecuta `./scripts/validate-atlas-connection.sh`
desde la raíz del proyecto para detectar un hostname antiguo.

Antes de continuar, ejecuta `atlas auth login` desde la consola y confirma la
sesión con `atlas auth whoami`. Si la sesión ha caducado, vuelve a ejecutar
`atlas auth login`.

Registra una conexion Kafka llamada `kafka_lab` con los topics `temperature` y `humidity`. Registra `atlas_lab` y crea las colecciones `playground.sensor_weather` y `playground.sensor_dlq`.

Cuando necesites consultar esas colecciones en el cluster Atlas, usa:

```bash
mongosh "$ATLAS_URI"
```

## Ejecucion

```javascript
load('[local-repository]/projects/04-late-data-join/processor.js')
sp.sensorJoins.start()
sp.sensorDLQUpdater.start()
sp.sensorJoins.stats()
```

El primer processor une temperatura y humedad en ventanas de 30 segundos, acepta cinco segundos de lateness y envia eventos tardios al DLQ. El segundo repara el materialized view desde ese DLQ.

Este laboratorio conserva el patron del articulo y requiere Kafka para probar lateness real.
