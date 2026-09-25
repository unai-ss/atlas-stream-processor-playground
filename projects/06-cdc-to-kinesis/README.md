# MongoDB CDC to Kinesis

Autor de la referencia: Igor Alekseev, publicado por MongoDB.

Fuente: https://medium.com/mongodb/streaming-mongodb-change-events-to-amazon-redshift-via-atlas-stream-processing-and-kinesis-9922cb2ef611

**Descripcion:** Convierte cambios de una coleccion Atlas en eventos compactos
y los publica en Kinesis usando `device_id` como clave de particion.

## Preparacion

Antes de usar `ATLAS_URI`, ejecuta `./scripts/validate-atlas-connection.sh`
desde la raíz del proyecto para detectar un hostname antiguo.

Antes de continuar, ejecuta `atlas auth login` desde la consola y confirma la
sesión con `atlas auth whoami`. Si la sesión ha caducado, vuelve a ejecutar
`atlas auth login`.

1. Crea una conexion `atlas_lab` apuntando al cluster de prueba.
2. Crea un stream Kinesis y una conexion Atlas llamada `kinesis_lab` con region, stream y role IAM configurados.
3. Inserta documentos en `playground.device_events` con `device_id`, `timestamp` y `obs.watts` / `obs.temp`.

Para insertar los documentos en el cluster Atlas, abre `mongosh` usando la URI
que ya contiene las credenciales de `stream[redacted]`:

```bash
mongosh "$ATLAS_URI"
```

El laboratorio solo crea el processor de Atlas. La configuracion IAM, Kinesis y Redshift debe hacerse fuera de este repositorio y nunca debe contener credenciales en archivos.

## Ejecucion

```javascript
load('[local-repository]/projects/06-cdc-to-kinesis/processor.js')
sp.labCdcKinesis.start()
sp.labCdcKinesis.stats()
```

Los cambios insert, update y replace se aplanan y se emiten a Kinesis con `device_id` como partition key.

Este laboratorio es una adaptacion local del articulo y requiere recursos AWS reales para observar el destino.
