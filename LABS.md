# Laboratorios Atlas Stream Processing

## Preparacion comun

Antes de iniciar cualquier laboratorio, asegúrate de haberte registrado desde
la consola con `atlas auth login` y confirma que la sesión está activa:

```bash
atlas auth whoami
```

Si la sesión ha caducado, ejecuta de nuevo `atlas auth login`.

Antes de conectarte al cluster en cualquier laboratorio, ejecuta desde la raíz:

```bash
source .env
./scripts/validate-atlas-connection.sh
```

Esto detecta hostnames antiguos si el cluster se ha recreado.

1. Crea un Stream Processing Instance dedicado en Atlas.
2. Crea una conexion Atlas llamada `atlas_lab` apuntando al cluster de prueba.
3. Entra con `mongosh` al endpoint del Stream Processing Instance.
4. Ejecuta el `processor.js` del laboratorio elegido.
5. Inicia el processor con el comando indicado en su README.

Los nombres de base de datos y colecciones son de laboratorio. Cambialos solo en
un proyecto Atlas de prueba. Las conexiones externas, como Kinesis o HTTP,
requieren configuracion adicional en el Connection Registry.

La guia de workspace y permisos esta en [ASP_OPERATIONS_GUIDE.md](ASP_OPERATIONS_GUIDE.md).

## Preflight independiente

Cada laboratorio posterior al 00 debe poder empezar sin ejecutar los anteriores.
Antes de cargar un pipeline, el usuario debe:

1. comprobar que el workspace y las conexiones requeridas están disponibles;
2. detener y eliminar el processor del propio laboratorio si ya existe;
3. limpiar únicamente sus colecciones de entrada y salida;
4. crear documentos nuevos después de arrancar el pipeline.

Los laboratorios no eliminan clusters, workspaces ni datos de otros
laboratorios. Si falta infraestructura, el preflight se detiene y remite al
[manual del laboratorio 00](projects/00-assessment/MANUAL.md).

## Orden sugerido

1. [Laboratorio 00: infraestructura y evaluacion](projects/00-assessment)
2. [Laboratorio 01: primer flujo con Sample](projects/01-fast-start)
3. [Laboratorio 02: vista de entregas con Change Streams](projects/02-taco-tracking)
4. [Laboratorio 03: agregacion de movimiento Ruuvi](projects/03-ruuvi-motion)
5. [Laboratorio 07: observabilidad y troubleshooting ASP](projects/07-metrics-observability)
6. [Laboratorio 08: paralelismo con Sample y Change Stream](projects/08-parallelism)
7. [Laboratorio 04: join con datos tardios](projects/04-late-data-join)
8. [Laboratorio 05: enriquecimiento HTTP](projects/05-http-enrichment)
9. [Laboratorio 06: CDC hacia Kinesis](projects/06-cdc-to-kinesis)

El laboratorio 07 se coloca antes de las integraciones externas para practicar
diagnostico con `sample_stream_solar`: estado, `stats()`, `sample()`, sink,
filtros, DLQ y logs. El laboratorio 08 reutiliza esa linea base en dos pasos:
primero observa el paralelismo con Sample y despues repite el experimento con
Change Stream, un lote reproducible y actualizaciones controladas.

Para crear la infraestructura común, sigue el [manual del laboratorio 00](projects/00-assessment/MANUAL.md).
Para ejecutar el modo reproducible del laboratorio 08, sigue su
[manual operativo](projects/08-parallelism/MANUAL.md).