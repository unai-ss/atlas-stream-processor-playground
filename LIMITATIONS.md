# Limitaciones y trabajo pendiente

Este documento registra las limitaciones conocidas del playground para convertirlas
progresivamente en trabajo verificable. Se aplica a los laboratorios de
`projects/` y a la operación descrita en `ASP_OPERATIONS_GUIDE.md`.

## Estado actual

El repositorio funciona actualmente como una colección educativa de processors
JavaScript para ejecutar manualmente en `mongosh`. Todavía no es un playground
reproducible de extremo a extremo.

## Dirección recomendada

El objetivo es convertir el repositorio en un recorrido pedagógico progresivo,
no solamente en una colección de ejemplos. Una persona nueva debería poder
clonar el repositorio, preparar un proyecto Atlas de pruebas y completar el
primer laboratorio sin tener que interpretar decisiones ocultas del proyecto.

### Ruta de aprendizaje

1. `01-fast-start`: `$source`, `$set`, `$emit` y ciclo de vida básico.
2. `02-taco-tracking`: Change Streams, filtrado y `$merge`.
3. `03-ruuvi-motion`: normalización, ventanas y agregaciones.
4. `04-late-data-join`: lateness, ventanas, DLQ y reparación.
5. `05-http-enrichment`: enriquecimiento externo y errores de servicios.
6. `06-cdc-to-kinesis`: integración avanzada con AWS.

Los laboratorios 01 a 03 deberían formar el núcleo de ASP y poder estudiarse
antes de introducir Kafka, APIs externas o AWS. Los laboratorios 04 a 06 deben
presentarse como operación avanzada e integraciones externas.

### Formato común de cada laboratorio

Cada README debería documentar, en el mismo orden:

- objetivo y conceptos ASP;
- arquitectura y prerrequisitos;
- formato de entrada y salida;
- pipeline explicado por etapas;
- ejecución y resultado esperado;
- comprobaciones y errores frecuentes;
- limpieza y ejercicios opcionales.

### Primer hito

El primer hito funcional debe completar `01-fast-start` de extremo a extremo:

- preflight de CLI, permisos, región y variables;
- modo `dry-run`;
- creación y limpieza controlada de recursos;
- processor en estado esperado;
- documentos entregados al sink;
- resumen final y evidencias redactadas.

Los demás laboratorios se deberían automatizar después de validar este camino
feliz. Cada uno debe incorporar una verificación reproducible y explicar qué
resultado demuestra que el concepto enseñado funciona.

### Diseño de ejercicios

Los laboratorios deberían terminar con variaciones pequeñas que obliguen a
razonar sobre el pipeline: cambiar una ventana, filtrar eventos, añadir un campo
calculado, enviar errores a un DLQ o modificar el destino. Así el playground
enseña el comportamiento de ASP en lugar de limitarse a ofrecer recetas para
copiar.

## Limitaciones

### L-01. Falta de ejecución automatizada

**Prioridad:** alta  
**Estado:** pendiente

Los processors se cargan manualmente desde `mongosh`. No existe todavía un
`run-playground.sh` que parametrice la región, cree los recursos, ejecute el
processor, recopile resultados y realice la limpieza.

**Trabajo previsto:** añadir modos `dry-run`, ejecución, limpieza, redacción de
evidencias y resumen por región.

### L-02. Falta de pruebas y validación reproducible

**Prioridad:** alta  
**Estado:** pendiente

No hay tests, lint, smoke tests ni CI. Tampoco hay evidencias de una ejecución
completa contra Atlas.

**Trabajo previsto:** empezar con un smoke test del laboratorio Sample y validar
estado del processor, contadores, entrega al sink y errores DLQ.

### L-03. Dependencias externas

**Prioridad:** alta  
**Estado:** pendiente

Algunos laboratorios necesitan servicios que no se pueden simular únicamente
con los archivos del repositorio:

- Kafka, topics y datos con formato compatible para `04-late-data-join`.
- IPInfo, conectividad HTTP y límites del servicio para `05-http-enrichment`.
- AWS Kinesis, IAM, stream y región para `06-cdc-to-kinesis`.
- Cluster Atlas y colecciones con el esquema esperado para varios laboratorios.

**Trabajo previsto:** documentar prerrequisitos por laboratorio y ofrecer una
ruta local o un modo de validación sin dependencias externas cuando sea viable.

### L-04. Configuración rígida en los processors

**Prioridad:** alta  
**Estado:** pendiente

Los nombres de conexiones, bases, colecciones, topics, stream Kinesis y región
están escritos directamente en los archivos `processor.js`. Esto obliga a editar
código para reutilizar un laboratorio en otro proyecto o región.

**Trabajo previsto:** centralizar la configuración y generar el pipeline a partir
de variables controladas, sin introducir credenciales en el repositorio.

### L-05. Fallbacks temporales débiles

**Prioridad:** media  
**Estado:** pendiente

Los processors `01-fast-start` y `03-ruuvi-motion` usan una fecha fija
(`2026-09-11T00:00:00Z`) cuando falta un timestamp válido. Esto puede concentrar
mensajes inválidos en una misma ventana y ocultar problemas de calidad de datos.

El processor Ruuvi tampoco valida que `time` tenga realmente tipo fecha antes de
usarlo.

**Trabajo previsto:** definir una política explícita para timestamps inválidos:
rechazo, DLQ, normalización controlada o timestamp de ingestión documentado.

### L-06. Compatibilidad con Atlas no comprobada automáticamente

**Prioridad:** alta  
**Estado:** pendiente

La guía documenta diferencias de API y regiones Azure, pero no hay una
comprobación automática de compatibilidad antes de crear workspaces, conexiones
o processors. Las combinaciones de ventanas, lateness, DLQ y `$top` requieren
validación real en la versión de Atlas objetivo.

**Trabajo previsto:** añadir un preflight que compruebe CLI, API version, región,
tier, permisos y capacidades necesarias para cada laboratorio.

### L-07. Permisos operativos más amplios de lo necesario

**Prioridad:** media  
**Estado:** pendiente

La guía usa el rol incorporado `atlasAdmin` para la conexión Atlas. Es sencillo
para un laboratorio aislado, pero puede ser excesivo en un proyecto compartido.

**Trabajo previsto:** documentar el alcance mínimo requerido y separar el modo
rápido de laboratorio del modo con permisos restringidos.

### L-08. Protección frente a uso accidental en producción

**Prioridad:** alta  
**Estado:** pendiente

Las reglas recomiendan usar un proyecto de pruebas, pero no existe una validación
automática que compruebe el proyecto, cluster o URI antes de ejecutar.

**Trabajo previsto:** exigir confirmación explícita, validar variables obligatorias
y bloquear valores de producción conocidos cuando se pueda determinar de forma
segura.

### L-09. Versionado incompleto de la base actual

**Prioridad:** alta  
**Estado:** pendiente

`LABS.md` y `projects/` aparecen como archivos no versionados en Git. El archivo
`.env` está ignorado correctamente, pero la primera incorporación de los
laboratorios todavía está pendiente.

**Trabajo previsto:** revisar el contenido, confirmar que no contiene secretos y
crear un commit inicial del catálogo y los laboratorios.

## Orden recomendado

1. Versionar `LABS.md` y `projects/` después de revisar secretos.
2. Estandarizar el README del laboratorio 01 y sus datos de entrada y salida.
3. Implementar el preflight y el ejecutor con `dry-run` y `cleanup`.
4. Validar end-to-end `01-fast-start` en una cuenta Atlas de pruebas.
5. Parametrizar conexiones y destinos.
6. Añadir ejercicios, smoke tests y documentación específica para Kafka, HTTP y Kinesis.
7. Endurecer permisos y controles contra producción.
8. Resolver los fallbacks temporales y ampliar las pruebas.

## Criterio de cierre

Una limitación se considera resuelta cuando existe una modificación documentada,
una prueba o comprobación reproducible y una evidencia que no contenga secretos
ni identificadores de cliente.
