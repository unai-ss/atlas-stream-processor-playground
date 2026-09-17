# Manual laboratorio 02: Change Streams y vista de entregas

Este manual permite repetir el laboratorio 02 desde cero usando el proyecto Atlas
`[redacted]`, el project id configurado en `.env`, un cluster M0 llamado
`Cluster0` y un workspace ASP llamado `asp-lab02-gcp-us-west1`.

El laboratorio transforma cambios de `playground.taco_events` en una vista
materializada `playground.taco_locations`, conservando el evento mas reciente
por `delivery_id` dentro de una ventana de un minuto.

No ejecutes este laboratorio contra produccion. No guardes contrasenas, URIs
completas ni evidencias sin redactar en GitHub.

## Recursos creados

| Recurso | Nombre |
|---|---|
| Atlas project | `[redacted]` |
| Project id | valor de `PROJECT_ID` en `.env` |
| Cluster | `Cluster0` |
| Cluster tier | `M0` |
| ASP workspace | `asp-lab02-gcp-us-west1` |
| ASP tier | `SP2` |
| Atlas connection | `atlas_lab` |
| MongoDB user | `[redacted]` |
| Processor | `labTacoTracking` |
| Input namespace | `playground.taco_events` |
| Output namespace | `playground.taco_locations` |

## Paso 0: preparar opciones

En una terminal del proyecto:

```bash
cd [local-repository]
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

El login del Atlas CLI y el usuario de `mongosh` son identidades distintas. El
usuario MongoDB usado en este manual es `[redacted]`.

## Paso 1: crear o validar `Cluster0`

Comprueba si existe:

```bash
atlas clusters describe "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --output json | jq -r '.name, .stateName, .providerSettings.instanceSizeName'
```

Si no existe, crea un M0:

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

## Paso 2: validar usuario y conexión MongoDB

Comprueba que existe el usuario, sin mostrar la contraseña:

```bash
atlas dbusers describe "[redacted]" \
  --projectId "$PROJECT_ID" \
  --output json | jq '{username, databaseName, roles}'
```

Conecta al cluster Atlas:

```bash
mongosh "$ATLAS_URI" \
  --username "[redacted]" \
  --password \
  --authenticationDatabase admin
```

Escribe la contraseña directamente cuando la terminal la solicite. Dentro de
`mongosh`, comprueba la identidad:

```javascript
db.runCommand({ connectionStatus: 1, showPrivileges: false })
```

`authenticatedUsers` no debe estar vacío. Si aparece vacío, corrige la URI o
la contraseña antes de continuar.

## Paso 3: preparar `taco_events`

En la sesión conectada al cluster Atlas:

```javascript
use playground
db.createCollection("taco_events")
```

Si la colección ya existe, continúa. `taco_locations` puede ser creada por
`$merge` durante la primera ventana.

Mantén esta sesión abierta. Se usará para insertar los eventos después de
arrancar el processor.

## Paso 4: crear el workspace ASP

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
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --file "$EVIDENCE_DIR/workspace.json" \
  --output json > "$EVIDENCE_DIR/workspace-created.json"
```

Comprueba el workspace:

```bash
atlas api streams getStreamWorkspace \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json | jq '{name, dataProcessRegion, streamConfig, hostnames}'
```

## Paso 5: crear `atlas_lab`

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
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --file "$EVIDENCE_DIR/atlas-connection.json" \
  --output json > "$EVIDENCE_DIR/atlas-connection-created.json"
```

Comprueba la conexión:

```bash
atlas api streams listStreamConnections \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json | jq '.connections // .results // .'
```

## Paso 6: conectar al workspace ASP

Obtén el hostname:

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

Debe terminar exactamente en `.mongodb.net`.

En una segunda terminal, conecta al workspace ASP con el mismo usuario MongoDB:

```bash
mongosh "mongodb://$ASP_HOST/" \
  --tls \
  --authenticationDatabase admin \
  --username "[redacted]" \
  --password
```

Dentro del workspace ASP:

```javascript
sp.listConnections()
```

Debe aparecer `atlas_lab` apuntando a `Cluster0`.

## Paso 7: crear y arrancar el processor

En la sesión ASP carga el archivo una sola vez:

```javascript
load("[local-repository]/projects/02-taco-tracking/processor.js")
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

## Paso 8: insertar eventos nuevos

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

## Paso 9: actualizar una entrega

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

## Paso 10: verificar la vista materializada

El processor usa una ventana tumbling de un minuto. Espera aproximadamente 60
segundos y consulta:

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

En la sesión ASP puedes revisar actividad:

```javascript
sp.labTacoTracking.stats()
```

## Paso 11: limpiar el laboratorio

En la sesión ASP:

```javascript
sp.labTacoTracking.stop()
sp.labTacoTracking.drop()
sp.listStreamProcessors()
```

Si la sesión ASP ya está cerrada, usa la API:

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

En la sesión Atlas elimina los datos si no los necesitas:

```javascript
use playground
db.taco_events.drop()
db.taco_locations.drop()
```

Elimina la conexión y el workspace:

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
