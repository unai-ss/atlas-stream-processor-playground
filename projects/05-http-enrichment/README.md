# IP traffic HTTP enrichment

Autor de la referencia: Kenny Gorman.

Fuente: https://medium.com/towards-data-engineering/enriching-via-api-the-https-operator-in-mongodb-atlas-stream-processing-bbe03ad70ac8

**Descripcion:** Enriquece eventos de trafico con datos de una API HTTP externa
y guarda en Atlas la informacion geografica devuelta para cada IP.

## Preparacion

Antes de usar `ATLAS_URI`, ejecuta `./scripts/validate-atlas-connection.sh`
desde la raíz del proyecto para detectar un hostname antiguo.

Antes de continuar, ejecuta `atlas auth login` desde la consola y confirma la
sesión con `atlas auth whoami`. Si la sesión ha caducado, vuelve a ejecutar
`atlas auth login`.

Registra una conexion HTTPS llamada `ipinfo` con base URL `https://ipinfo.io/`. Si usas token, configuralo como secreto en el Connection Registry. El laboratorio usa IPs de documentacion y genera los eventos con `$source.documents`.

Para consultar la salida en el cluster Atlas, conecta con:

```bash
mongosh "$ATLAS_URI"
```

## Ejecucion

```javascript
load('[local-repository]/projects/05-http-enrichment/processor.js')
sp.labHttpEnrichment.start()
sp.labHttpEnrichment.stats()
```

El resultado se escribe en `playground.ip_traffic_enriched` con ciudad, region y pais devueltos por la API.

La llamada HTTP genera coste o limites del servicio externo si se cambia la fuente de ejemplo. Este laboratorio es una adaptacion local del articulo.
