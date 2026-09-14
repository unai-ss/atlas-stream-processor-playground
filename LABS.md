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