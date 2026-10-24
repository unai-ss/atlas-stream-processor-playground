# Referencia histórica de infraestructura del laboratorio 02

> Esta referencia conserva comandos antiguos de preparación. Para el recorrido
> actual usa [MANUAL.md](MANUAL.md) y crea la infraestructura únicamente desde
> el [laboratorio 00](../00-assessment/MANUAL.md).

Antes de ejecutar comandos Atlas, registra la sesión desde la consola con
`atlas auth login` y confirma con `atlas auth whoami`.

Este manual permite repetir el laboratorio 02 desde cero usando el proyecto Atlas
`xxxxxxxxxxx`, el project id configurado en `.env`, un cluster M0 llamado
`Cluster0` y un workspace ASP llamado `asp-lab02-gcp-us-west1`.

El laboratorio transforma cambios de `playground.taco_events` en una vista
materializada `playground.taco_locations`, conservando el evento mas reciente
por `delivery_id` dentro de una ventana de un minuto.

El `$source` usa `fullDocument: "updateLookup"` para incluir el documento
posterior en los eventos `update`. Con `whenAvailable`, un `update` puede no
incluir `fullDocument`, ser descartado por el `$match` y dejar la vista con el
estado anterior.

El pipeline tambien exige `delivery_id` de tipo string y `timestamp` de tipo
fecha. Esto evita que comprobaciones auxiliares u otros documentos sin la forma
de una entrega creen una salida con `_id: null`.

No ejecutes este laboratorio contra produccion. No guardes contrasenas, URIs
completas ni evidencias sin redactar en GitHub.

## Recursos creados

| Recurso | Nombre |
|---|---|
| Atlas project | `xxxxxxxxxxxxxxx` |
| Project id | valor de `PROJECT_ID` en `.env` |
| Cluster | `xxxxxxxxxxx` |
| Cluster tier | `M0` |
| ASP workspace | `asp-lab02-gcp-us-west1` |
| ASP tier | `SP2` |
| Atlas connection | `atlas_lab` |
| Atlas CLI user | `xxxxxxx` |
| MongoDB user | `xxxxxxxx` |
| Processor | `labTacoTracking` |
| Input namespace | `playground.taco_events` |
| Output namespace | `playground.taco_locations` |

## Paso 0: preparar opciones

En una terminal del proyecto:

```bash
cd ~/Documents/atlas-stream-processor-playground
source .env

export CLUSTER_NAME="Cluster0"
export WORKSPACE="asp-lab02-gcp-us-west1"
export DATABASE_NAME="playground"
export INPUT_COLLECTION="taco_events"
export OUTPUT_COLLECTION="taco_locations"
export PROCESSOR="labTacoTracking"
export PROVIDER="GCP"
export REGION="US_WEST1"
export TIER="SP2"
export MAX_TIER="SP2"
export EVIDENCE_DIR="readiness-evidence/${WORKSPACE}"

mkdir -p "$EVIDENCE_DIR"
```

Comprueba las herramientas y el login del Atlas CLI:

```bash
atlas --version
mongosh --version
jq --version
atlas whoami
```

Si el login ha caducado:

```bash
atlas auth login
```

El login de Atlas CLI y el usuario de `mongosh` son identidades distintas:

- `xxxxxxxxx` es la cuenta de Atlas CLI para gestionar el proyecto, el
  cluster y el workspace ASP.
- `streamUser` es el usuario de base de datos, autenticado con contraseña para
  `mongosh` y para la conexión `atlas_lab`.

## Paso 1: comprobar y preparar los clusters

Antes de crear recursos, comprueba todos los clusters del proyecto. No uses
`atlas clusters describe "Cluster0"` como unica comprobacion: `Cluster0` puede
no existir aunque haya otro cluster en el proyecto.

```bash
CLUSTERS_JSON="$(atlas clusters list \
  --projectId "$PROJECT_ID" \
  --output json)"

CLUSTER_COUNT="$(printf '%s' "$CLUSTERS_JSON" | jq '.results // [] | length')"

if [[ "$CLUSTER_COUNT" -gt 0 ]]; then
  printf '%s\n' "Clusters encontrados en el proyecto:"
  printf '%s\n' "$CLUSTERS_JSON" | jq -r \
    '.results[]? | [.name, .stateName, .providerSettings.instanceSizeName] | @tsv'

  printf '%s\n' "Estos clusters pueden contener datos. No los borres si no son del laboratorio."
  printf '%s' "Borrar TODOS los clusters encontrados para empezar desde cero? (si/no): "
  read -r DELETE_CLUSTERS

  if [[ "$DELETE_CLUSTERS" == "si" ]]; then
    while IFS= read -r EXISTING_CLUSTER; do
      [[ -z "$EXISTING_CLUSTER" ]] && continue
      atlas clusters delete "$EXISTING_CLUSTER" \
        --projectId "$PROJECT_ID" \
        --force \
        --watch
    done < <(printf '%s\n' "$CLUSTERS_JSON" | jq -r '.results[]?.name')
  else
    printf '%s\n' "No se borro ningun cluster. Deten el laboratorio y revisa el proyecto antes de continuar."
  fi
else
  printf '%s\n' "No hay clusters en el proyecto."
fi
```

Si respondes `no`, no ejecutes el paso siguiente. Si respondes `si`, verifica
que la lista quede vacia antes de crear el cluster:

```bash
atlas clusters list \
  --projectId "$PROJECT_ID" \
  --output json | jq -r '.results[]? | [.name, .stateName] | @tsv'
```

La salida debe estar vacia. Si aparece algun cluster, espera a que termine su
eliminacion o detente y revisa el nombre antes de continuar.

## Paso 2: crear `Cluster0`

Cuando no quede ningun cluster, crea un M0:

```bash
atlas clusters create "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --provider AWS \
  --region EU_WEST_1 \
  --tier M0 \
  --tag env=playground \
  --watch
```

El estado esperado es `IDLE`. Si `EU_WEST_1` no está disponible para M0, usa
una región M0 indicada por el error del CLI.

## Paso 3: validar usuario y conexion MongoDB

Comprueba que existe el usuario, sin mostrar la contraseña:

```bash
atlas dbusers describe "streamUser" \
  --projectId "$PROJECT_ID" \
  --output json | jq '{username, databaseName, roles}'
```

El usuario debe tener como minimo el rol `readWrite` sobre la base de datos
`playground`. Si la salida no muestra ese rol, abre Atlas UI > Database Access,
edita `streamUser` y añade el rol integrado `readWrite` con `playground` como
base de datos. Guarda el cambio y vuelve a conectar `mongosh`.

El rol `atlasAdmin` de `dbRoleToExecute` en la conexion `atlas_lab` es
independiente: autoriza al processor ASP y no cambia los permisos del usuario
`streamUser` cuando se conecta directamente al cluster.

Conecta al cluster Atlas:

```bash
mongosh "$ATLAS_URI"
```

`ATLAS_URI` ya contiene las credenciales de `streamUser`. Dentro de `mongosh`,
comprueba la identidad:

```javascript
db.runCommand({ connectionStatus: 1, showPrivileges: false })
```

`authenticatedUsers` no debe estar vacío. Si aparece vacío, corrige la URI o
la contraseña antes de continuar.

Comprueba que la escritura funciona antes de arrancar el processor:

```javascript
db.runCommand({ connectionStatus: 1, showPrivileges: false })
use playground
db.taco_events.insertOne({ _permission_check: true, created_at: new Date() })
db.taco_events.deleteOne({ _permission_check: true })
```

Si aparece `not allowed to do action [insert]` o `[update]`, detente y corrige
el rol `readWrite`; no continúes con el experimento.

## Paso 4: preparar `taco_events`

En la sesión conectada al cluster Atlas:

```javascript
use playground
db.createCollection("taco_events")
```

Si la colección ya existe, continúa. `taco_locations` puede ser creada por
`$merge` durante la primera ventana.

Mantén esta sesión abierta. Se usará para insertar los eventos después de
arrancar el processor.

## Paso 5: crear el workspace ASP

Desde la terminal del proyecto:

```bash
jq -n \
  --arg name "$WORKSPACE" \
  --arg provider "$PROVIDER" \
  --arg region "$REGION" \
  --arg tier "$TIER" \
  --arg maxTierSize "$MAX_TIER" \
  '{
    name: $name,
    dataProcessRegion: {
      cloudProvider: $provider,
      region: $region
    },
    streamConfig: {
      tier: $tier,
      maxTierSize: $maxTierSize
    }
  }' > "$EVIDENCE_DIR/workspace.json"

atlas api streams createStreamWorkspace \
  --groupId "$PROJECT_ID" \
  --file "$EVIDENCE_DIR/workspace.json" \
  --output json > "$EVIDENCE_DIR/workspace-created.json"
```

Comprueba el workspace:

```bash
atlas api streams getStreamWorkspace \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json > "$EVIDENCE_DIR/workspace-status.json" && \
jq '{name, dataProcessRegion, streamConfig, hostnames}' \
  "$EVIDENCE_DIR/workspace-status.json"
```

## Paso 6: crear `atlas_lab`

```bash
jq -n \
  --arg cluster "$CLUSTER_NAME" \
  '{
    name: "atlas_lab",
    type: "Cluster",
    clusterName: $cluster,
    dbRoleToExecute: { role: "atlasAdmin", type: "BUILT_IN" }
  }' > "$EVIDENCE_DIR/atlas-connection.json"

atlas api streams createStreamConnection \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --file "$EVIDENCE_DIR/atlas-connection.json" \
  --output json > "$EVIDENCE_DIR/atlas-connection-created.json"
```

Comprueba la conexión:

```bash
atlas api streams listStreamConnections \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json | jq '.connections // .results // .'
```

## Paso 7: conectar al workspace ASP

Obtén el hostname:

```bash
export ASP_HOST="$(
  atlas api streams getStreamWorkspace \
    --groupId "$PROJECT_ID" \
    --tenantName "$WORKSPACE" \
    --output json > "$EVIDENCE_DIR/workspace-status.json" && \
  jq -r '.hostnames[0]' "$EVIDENCE_DIR/workspace-status.json"
)"

printf '[%s]\n' "$ASP_HOST"
```

Debe terminar exactamente en `.mongodb.net`.

En una segunda terminal, conecta al workspace ASP con el mismo usuario MongoDB:

```bash
mongosh "mongodb://$ASP_HOST/" \
  --tls \
  --authenticationDatabase admin \
  --username "streamUser" \
  --password
```

Dentro del workspace ASP:

```javascript
sp.listConnections()
```

Debe aparecer `atlas_lab` apuntando a `Cluster0`.

## Paso 8: crear y arrancar el processor

Si acabas de cambiar el processor, detenlo y eliminalo antes de volver a
cargar el archivo:

```javascript
sp.labTacoTracking.stop()
sp.labTacoTracking.drop()
```

Un processor nuevo comienza desde los eventos que lleguen despues de su
inicio; no reprocesa automaticamente los eventos antiguos.

En la sesión ASP carga el archivo una sola vez:

```javascript
load("projects/02-taco-tracking/processor.js")
sp.listStreamProcessors()
```

Debe aparecer `labTacoTracking`. Si ya aparece, no repitas `load()`.

Arráncalo una sola vez:

```javascript
sp.labTacoTracking.start()
sp.labTacoTracking.stats()
```

Si recibes `stream processor has already been started`, el processor ya está
activo; continúa con el paso siguiente.

## Paso 9: insertar eventos nuevos

Vuelve a la sesión del cluster Atlas y ejecuta:

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

Los eventos deben insertarse después de arrancar el processor. Los documentos
anteriores no se reprocesan automáticamente por el Change Stream.

## Paso 10: actualizar una entrega

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

La respuesta esperada incluye `matchedCount: 1` y `modifiedCount: 1`.

Cuando haya comenzado el minuto siguiente, avanza el watermark con un evento
posterior:

```javascript
db.taco_events.updateOne(
  { delivery_id: "taco-002" },
  { $set: { timestamp: new Date() } }
)
```

La ventana tumbling puede no emitir inmediatamente al esperar 60 segundos: ASP
necesita recibir un evento posterior para demostrar que la ventana anterior ha
terminado. No uses timestamps futuros para forzarlo.

## Paso 11: verificar la vista materializada

El processor usa una ventana tumbling de un minuto. Tras avanzar el watermark,
consulta:

```javascript
db.taco_locations.find().sort({ _id: 1 }).pretty()
db.taco_locations.countDocuments()
db.taco_locations.findOne({ _id: "taco-001" })
```

El resultado correcto contiene un documento por entrega. `taco-001` debe tener:

```text
dist: 400
status: delivered
updated_at: Date
```

Si el processor se recreo durante la practica, prueba con eventos insertados
despues de ese reinicio o limpia `taco_locations` antes de comparar resultados;
la vista puede conservar documentos de una ejecucion anterior.

En la sesión ASP puedes revisar actividad:

```javascript
sp.labTacoTracking.stats()
```

## Paso 12: limpiar el laboratorio

En la sesión ASP:

```javascript
sp.labTacoTracking.stop()
sp.labTacoTracking.drop()
sp.listStreamProcessors()
```

Si la sesión ASP ya está cerrada, usa la API:

```bash
atlas api streams stopStreamProcessor \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --processorName "$PROCESSOR" \
  --output json

atlas api streams deleteStreamProcessor \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --processorName "$PROCESSOR" \
  --output json
```

En la sesión Atlas elimina los datos si no los necesitas:

```javascript
use playground
db.taco_events.drop()
db.taco_locations.drop()
```

Elimina la conexión y el workspace:

```bash
atlas api streams deleteStreamConnection \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --connectionName "atlas_lab" \
  --output json

atlas api streams deleteStreamWorkspace \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json
```

Si también quieres eliminar el cluster de pruebas:

```bash
atlas clusters delete "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --force \
  --watch
```

Verifica que no queda:

```bash
atlas clusters describe "$CLUSTER_NAME" --projectId "$PROJECT_ID"
```

El resultado esperado es `CLUSTER_NOT_FOUND`.
