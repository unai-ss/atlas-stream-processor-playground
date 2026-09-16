# Manual laboratorio 01: Cluster0 M0 y primer processor ASP

Este manual permite repetir el laboratorio 01 desde cero en el proyecto Atlas
`[redacted]`, usando un cluster M0 llamado `Cluster0` y un workspace de
Atlas Stream Processing llamado `asp-lab01-gcp-us-west1`.

El manual usa el `PROJECT_ID` configurado en `.env`. Si se reutiliza en otro
proyecto, cambia `.env` y no edites los comandos uno por uno.

No ejecutes este laboratorio contra datos de produccion. No pegues contrasenas,
connection strings ni capturas con secretos en tickets, commits o chats.

## Recursos creados

| Recurso | Nombre |
|---|---|
| Atlas project | `[redacted]` |
| Project id | `658d4a0cfdc68a319efa586a` |
| Cluster | `Cluster0` |
| Cluster tier | `M0` |
| ASP workspace | `asp-lab01-gcp-us-west1` |
| ASP tier | `SP2` |
| Sample source | `sample_stream_solar` |
| Atlas sink connection | `atlas_lab` |
| Processor | `labFastStart` |
| Sink namespace | `playground.fast_start_events` |

## Paso 0: preparar entorno local

```bash
cd [local-repository]
source .env

export CLUSTER_NAME="Cluster0"
export DATABASE_NAME="playground"
export COLLECTION_NAME="fast_start_events"
export WORKSPACE="asp-lab01-gcp-us-west1"
export PROCESSOR="labFastStart"
export PROVIDER="GCP"
export REGION="US_WEST1"
export TIER="SP2"
export MAX_TIER="SP2"
export EVIDENCE_DIR="readiness-evidence/${WORKSPACE}"

mkdir -p "$EVIDENCE_DIR"
```

Comprueba herramientas y sesion:

```bash
atlas --version
mongosh --version
jq --version
atlas auth whoami
```

Si la sesion Atlas esta caducada:

```bash
atlas auth login
```

## Paso 1: crear o validar Cluster0 M0

Comprueba si `Cluster0` ya existe:

```bash
atlas clusters describe "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --output json | jq -r '.name, .stateName, .providerSettings.instanceSizeName'
```

Si no existe, crealo como M0 gratuito cuando la organizacion y la region lo
permitan:

```bash
atlas clusters create "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --provider AWS \
  --region EU_WEST_1 \
  --tier M0 \
  --tag env=playground \
  --watch
```

Si `EU_WEST_1` no esta disponible para M0, usa una region M0 aceptada por el
error del CLI, por ejemplo `US_EAST_1`.

Vuelve a comprobar el estado:

```bash
atlas clusters describe "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --output json | jq -r '.name, .stateName, .providerSettings.instanceSizeName'
```

El estado esperado al terminar es `IDLE` y tier `M0`.

## Paso 2: preparar credenciales de base de datos

Necesitas un usuario de base de datos con permisos suficientes para el
laboratorio. Si ya tienes un usuario en `ATLAS_URI`, reutilizalo. Si necesitas
crear uno nuevo, usa una contrasena local que no se guarde en Git ni en el
historial de shell:

```bash
printf 'Password for stream[redacted]: '
read -r -s DB_PASSWORD
printf '\n'

atlas dbusers create atlasAdmin \
  --projectId "$PROJECT_ID" \
  --username stream[redacted] \
  --password "$DB_PASSWORD"

unset DB_PASSWORD
```

Autoriza tu IP actual si el cluster no acepta conexiones desde tu maquina:

```bash
atlas accessLists create "$(curl -s https://checkip.amazonaws.com)/32" \
  --projectId "$PROJECT_ID" \
  --comment "asp playground local access"
```

Actualiza `.env` localmente con la URI del cluster si es necesario. No subas
`.env` a Git.

## Paso 3: crear el workspace ASP

Genera la definicion del workspace:

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
```

Crea el workspace:

```bash
atlas api streams createStreamWorkspace \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --file "$EVIDENCE_DIR/workspace.json" \
  --output json > "$EVIDENCE_DIR/workspace-created.json"
```

Comprueba que existe:

```bash
atlas api streams getStreamWorkspace \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json | jq '{name, dataProcessRegion, streamConfig, hostnames}'
```

## Paso 4: comprobar la fuente Sample

Lista conexiones del workspace:

```bash
atlas api streams listStreamConnections \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json | jq '.connections // .results // .'
```

Si `sample_stream_solar` no aparece, crea la conexion:

```bash
jq -n '{name:"sample_stream_solar",type:"Sample"}' \
  > "$EVIDENCE_DIR/sample-connection.json"

atlas api streams createStreamConnection \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --file "$EVIDENCE_DIR/sample-connection.json" \
  --output json > "$EVIDENCE_DIR/sample-connection-created.json"
```

## Paso 5: crear la conexion Atlas `atlas_lab`

```bash
jq -n \
  --arg cluster "$CLUSTER_NAME" \
  '{
    name:"atlas_lab",
    type:"Cluster",
    clusterName:$cluster,
    dbRoleToExecute:{role:"atlasAdmin",type:"BUILT_IN"}
  }' > "$EVIDENCE_DIR/atlas-connection.json"

atlas api streams createStreamConnection \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --file "$EVIDENCE_DIR/atlas-connection.json" \
  --output json > "$EVIDENCE_DIR/atlas-connection-created.json"
```

## Paso 6: preparar la coleccion time-series

Ejecuta esto contra el cluster Atlas, no contra el workspace ASP:

```bash
mongosh "$ATLAS_URI" --quiet --eval '
const database = db.getSiblingDB("playground");
const name = "fast_start_events";
const info = database.getCollectionInfos({ name })[0];

if (!info) {
  database.createCollection(name, { timeseries: { timeField: "timestamp" } });
  print("SINK_TIMESERIES_CREATED");
} else if (!info.options.timeseries) {
  print("SINK_COLLECTION_IS_NOT_TIMESERIES");
  quit(2);
} else {
  print("SINK_TIMESERIES_EXISTS");
}
'
```

## Paso 7: conectarse al workspace ASP

Obtiene el host del workspace:

```bash
export ASP_HOST="$(
  atlas api streams getStreamWorkspace \
    --version 2025-02-19 \
    --groupId "$PROJECT_ID" \
    --tenantName "$WORKSPACE" \
    --output json | jq -r '.hostnames[0]'
)"

printf '[%s]\n' "$ASP_HOST"
```

El valor debe terminar en `.mongodb.net`, sin texto extra al final.

Conecta con `mongosh`:

```bash
mongosh "mongodb://$ASP_HOST/" \
  --tls \
  --authenticationDatabase admin \
  --username stream[redacted] \
  --password
```

Sustituye `stream[redacted]` si tu usuario de base de datos tiene otro nombre.
Escribe la contrasena directamente en la terminal cuando `mongosh` la pida.

## Paso 8: validar que Sample emite datos

Dentro del `mongosh` conectado al workspace ASP:

```javascript
sp.listConnections()

sp.process([
  {
    $source: {
      connectionName: "sample_stream_solar"
    }
  }
])
```

Si ves eventos, termina el processor temporal con `Ctrl-C`.

## Paso 9: crear y arrancar `labFastStart`

Dentro del `mongosh` conectado al workspace ASP:

```javascript
load("[local-repository]/projects/01-fast-start/processor.js")
sp.listStreamProcessors()
sp.labFastStart.start()
sp.labFastStart.stats()
sp.labFastStart.sample()
```

## Paso 10: verificar la salida en Atlas

En otra terminal, contra el cluster Atlas:

```bash
mongosh "$ATLAS_URI" --quiet --eval '
const database = db.getSiblingDB("playground");
print("count:");
print(database.fast_start_events.countDocuments());
print("sample:");
printjson(database.fast_start_events.findOne({ timestamp: { $type: "date" } }));
'
```

El laboratorio pasa si el contador es mayor que cero y el documento contiene
`timestamp`, `device_id`, `obs.watts` y `obs.temp`.

## Paso 11: limpiar ASP y Cluster0

Primero elimina el processor desde el workspace ASP:

```javascript
sp.labFastStart.stop()
sp.labFastStart.drop()
sp.listStreamProcessors()
```

Si ya no tienes una sesion `mongosh` abierta contra el workspace ASP, usa la
API en su lugar:

```bash
atlas api streams stopStreamProcessor \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --processorName "$PROCESSOR" \
  --output json

atlas api streams deleteStreamProcessor \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --processorName "$PROCESSOR" \
  --output json
```

Despues elimina conexiones y workspace desde la terminal:

```bash
atlas api streams deleteStreamConnection \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --connectionName "atlas_lab" \
  --output json

atlas api streams deleteStreamWorkspace \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json
```

Elimina `sample_stream_solar` solo si la creaste manualmente y no venia por
defecto en el workspace.

Finalmente destruye `Cluster0`:

```bash
atlas clusters delete "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --force \
  --watch
```

Comprueba que ya no existe:

```bash
atlas clusters describe "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID"
```

El resultado esperado es un error indicando que el cluster no existe.
