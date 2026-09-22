# Laboratorios Atlas Stream Processing

## Preparacion comun

1. Crea un Stream Processing Instance dedicado en Atlas.
2. Crea una conexion Atlas llamada `atlas_lab` apuntando al cluster de prueba.
3. Entra con `mongosh` al endpoint del Stream Processing Instance.
4. Ejecuta el `processor.js` del laboratorio elegido.
5. Inicia el processor con el comando indicado en su README.

Los nombres de base de datos y colecciones son de laboratorio. Cambialos solo en
un proyecto Atlas de prueba. Las conexiones externas, como Kinesis o HTTP,
requieren configuracion adicional en el Connection Registry.

La guia de workspace y permisos esta en [ASP_OPERATIONS_GUIDE.md](ASP_OPERATIONS_GUIDE.md).

## Orden sugerido

1. [Laboratorio 01: primer flujo con Sample](projects/01-fast-start)
2. [Laboratorio 02: vista de entregas con Change Streams](projects/02-taco-tracking)
3. [Laboratorio 03: agregacion de movimiento Ruuvi](projects/03-ruuvi-motion)
4. [Laboratorio 07: observabilidad y troubleshooting ASP](projects/07-metrics-observability)
5. [Laboratorio 08: paralelismo en las tres fases del ETL](projects/08-parallelism)
6. [Laboratorio 04: join con datos tardios](projects/04-late-data-join)
7. [Laboratorio 05: enriquecimiento HTTP](projects/05-http-enrichment)
8. [Laboratorio 06: CDC hacia Kinesis](projects/06-cdc-to-kinesis)

El laboratorio 07 se coloca antes de las integraciones externas para practicar
diagnostico con datos controlados: estado, `stats()`, `sample()`, sink, filtros,
DLQ y logs.