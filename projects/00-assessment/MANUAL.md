# Manual laboratorio 00: infraestructura común del playground

Este manual prepara una vez la infraestructura que reutilizan los laboratorios
01, 02, 07 y 08: proyecto Atlas de pruebas, cluster, usuario, workspace ASP,
conexiones y colecciones iniciales. Los laboratorios posteriores se concentran
en pipelines, observabilidad y creación de documentos.

El manual usa el `PROJECT_ID` configurado en `.env`. Si se reutiliza en otro
proyecto, cambia `.env` y no edites los comandos uno por uno.

No ejecutes este laboratorio contra datos de produccion. No pegues contrasenas,
connection strings ni capturas con secretos en tickets, commits o chats.

## Recursos creados

| Recurso | Nombre |
|---|---|
| Atlas project | `xxxxxxxxxxx` |
| Project id | `xxxxxxxxxxxx` |
| Cluster | `xxxxxxxx` |
| Cluster tier | `M0` |
| ASP workspace | `xxxxxxxxxx` |
| ASP tier | `SP2` |
| Sample source | `sample_stream_solar` |
| Atlas sink connection | `atlas_lab` |
| Shared database | `playground` |

## Paso 0: preparar entorno local

Registra primero la sesión del Atlas CLI desde la consola y confirma que está
activa:

```bash
atlas auth login
atlas auth whoami
```

Si la sesión ha caducado, ejecuta de nuevo `atlas auth login`.

```bash
cd ~/Documents/atlas-stream-processor-playground
source .env

export CLUSTER_NAME="Cluster0"
export DATABASE_NAME="playground"
export COLLECTION_NAME="fast_start_events"
export WORKSPACE="asp-lab01-gcp-us-west1"
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

Antes de usar `mongosh`, valida que `ATLAS_URI` apunta al cluster actual:

```bash
./scripts/validate-atlas-connection.sh
```

Si falla, actualiza el hostname local con el endpoint que muestre el preflight
y vuelve a ejecutarlo.

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
printf 'Password for streamUser: '
read -r -s DB_PASSWORD
printf '\n'

atlas dbusers create atlasAdmin \
  --projectId "$PROJECT_ID" \
  --username streamUser \
  --password "$DB_PASSWORD"

unset DB_PASSWORD
```

Para este laboratorio, `streamUser` debe tener el rol `readWrite` sobre la
base de datos `playground`. El usuario del Atlas CLI y el usuario de MongoDB
son identidades distintas.

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
  --groupId "$PROJECT_ID" \
  --file "$EVIDENCE_DIR/workspace.json" \
  --output json > "$EVIDENCE_DIR/workspace-created.json"
```

Comprueba que existe:

```bash
atlas api streams getStreamWorkspace \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json > "$EVIDENCE_DIR/workspace-status.json" && \
jq '{name, dataProcessRegion, streamConfig, hostnames}' \
  "$EVIDENCE_DIR/workspace-status.json"
```

## Paso 4: comprobar la fuente Sample

Lista conexiones del workspace:

```bash
atlas api streams listStreamConnections \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json | jq '.connections // .results // .'
```

Si `sample_stream_solar` no aparece, crea la conexion:

```bash
jq -n '{name:"sample_stream_solar",type:"Sample"}' \
  > "$EVIDENCE_DIR/sample-connection.json"

atlas api streams createStreamConnection \
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
    --groupId "$PROJECT_ID" \
    --tenantName "$WORKSPACE" \
    --output json > "$EVIDENCE_DIR/workspace-status.json" && \
  jq -r '.hostnames[0]' "$EVIDENCE_DIR/workspace-status.json"
)"

printf '[%s]\n' "$ASP_HOST"
```

El valor debe terminar en `.mongodb.net`, sin texto extra al final.

Conecta con `mongosh`:

```bash
mongosh "mongodb://$ASP_HOST/" \
  --tls \
  --authenticationDatabase admin \
  --username streamUser \
  --password
```

El usuario de base de datos usado por este playground es `streamUser`. La
cuenta `xxxxxxxxx` se usa para autenticarse con Atlas CLI.
Escribe la contrasena directamente en la terminal cuando `mongosh` la pida.

## Paso 8: validar la infraestructura

Confirma que el workspace y las conexiones aparecen en estado `READY`:

```bash
atlas api streams listStreamConnections \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json | jq '.connections // .results // .'
```

El pipeline y los documentos se crean en los laboratorios 01, 02, 07 y 08.

## Paso 9: limpiar la infraestructura

Detén y elimina primero los processors desde el README del laboratorio que
estés ejecutando. Después elimina conexiones, workspace y cluster solo si son
recursos exclusivos de esta práctica.

Despues elimina conexiones y workspace desde la terminal:

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
