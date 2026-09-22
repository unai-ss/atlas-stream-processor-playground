# Atlas Stream Processing Operations Guide

This guide provides the complete command-line workflow for creating, validating, and cleaning up an Atlas Stream Processing (ASP) playground.

It is written for a dedicated Atlas test project. Do not run it against production resources.

## 1. Required Tools

Install and verify:

```bash
atlas --version
jq --version
mongosh --version
```

Use `mongosh` version 2.0 or later for the Stream Processing shell helpers.

Authenticate the Atlas CLI:

```bash
atlas auth login
atlas projects list
```

The account must have permissions to manage Stream Processing workspaces, connections, and processors. The database user in `ATLAS_URI` must have at least the `readWrite` role on the test database so it can create, update, and query the test sink collection. The `dbRoleToExecute` role on an ASP connection is separate from the database user's own roles.

## 2. Local Configuration

Create the local configuration file:

```bash
cp .env.example .env
source .env
```

Required variables:

```bash
export PROJECT_ID="<atlas-project-id>"
export CLUSTER_NAME="<atlas-cluster-name>"
export ATLAS_URI="<atlas-connection-string>"
export ATLAS_ORG="<atlas-organization-id>"
export TIER="SP2"
export MAX_TIER="SP2"
export DATABASE_NAME="playground"
export COLLECTION_NAME="fast_start_events"
export EVIDENCE_ROOT="readiness-evidence"
export CLEANUP="true"
```

Check access without printing the connection string:

```bash
printf 'PROJECT_ID=%s\nCLUSTER_NAME=%s\nTIER=%s\n' "$PROJECT_ID" "$CLUSTER_NAME" "$TIER"
atlas clusters list --projectId "$PROJECT_ID" --output json
```

## 3. Define the Workspace

Use a unique workspace name:

```bash
export PROVIDER="GCP"
export REGION="US_WEST1"
export REGION_LABEL="us-west1"
export WORKSPACE="asp-playground-${PROVIDER,,}-${REGION_LABEL}"
export PROCESSOR="${WORKSPACE}-processor"
export EVIDENCE_DIR="${EVIDENCE_ROOT}/${WORKSPACE}"

mkdir -p "$EVIDENCE_DIR"
```

For Azure, use the literal Azure region value accepted by the Stream Processing endpoint:

```text
southeastasia
northeurope
eastasia
```

Do not use `EUROPE_NORTH`, `ASIA_EAST`, or `ASIA_SOUTH_EAST` with `createStreamWorkspace`.

Generate the workspace request:

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

Create the workspace using the API version selected by your installed Atlas CLI.
Do not force `2025-02-19` unless `atlas api` reports that your CLI supports it.

```bash
atlas api streams createStreamWorkspace \
  --groupId "$PROJECT_ID" \
  --file "$EVIDENCE_DIR/workspace.json" \
  --output json > "$EVIDENCE_DIR/workspace-created.json"
```

Verify the workspace:

```bash
atlas api streams getStreamWorkspace \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json > "$EVIDENCE_DIR/workspace-status.json"
```

Confirm the provider, region, tier, and max tier:

```bash
jq '{name, groupId, dataProcessRegion, streamConfig}' \
  "$EVIDENCE_DIR/workspace-status.json"
```

## 4. Create the Source Connection

The default Stream Processing Workspace includes the `sample_stream_solar`
connection. Check the connection registry before creating it. Only create the
connection below if it is missing:

```bash
jq -n \
  '{name:"sample_stream_solar",type:"Sample"}' \
  > "$EVIDENCE_DIR/sample-connection.json"

atlas api streams createStreamConnection \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --file "$EVIDENCE_DIR/sample-connection.json" \
  --output json > "$EVIDENCE_DIR/sample-connection-created.json"
```

List connections:

```bash
atlas api streams listStreamConnections \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json > "$EVIDENCE_DIR/connections.json"
```

The connection should report state `READY`.

## 5. Create the Atlas Sink Connection

Create an Atlas cluster connection named `atlas_lab`. This is the connection
name used by laboratory 01 and by the processor definition below.

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

## 6. Prepare the Time-Series Sink

The `$emit` operator used by this playground writes to an Atlas time-series collection. Create the collection before starting the processor:

```bash
mongosh "$ATLAS_URI" --quiet --eval \
  'const database=db.getSiblingDB("'"$DATABASE_NAME"'");
   const name="'"$COLLECTION_NAME"'";
   const info=database.getCollectionInfos({name})[0];
   if (!info) {
     database.createCollection(name,{timeseries:{timeField:"timestamp"}});
     print("SINK_TIMESERIES_CREATED");
   } else if (!info.options.timeseries) {
     print("SINK_COLLECTION_IS_NOT_TIMESERIES");
     quit(2);
   } else {
     print("SINK_TIMESERIES_EXISTS");
   }'
```

Verify the namespace and time field:

```bash
mongosh "$ATLAS_URI" --quiet --eval \
  'const database=db.getSiblingDB("'"$DATABASE_NAME"'");
   const info=database.getCollectionInfos({name:"'"$COLLECTION_NAME"'"})[0];
   printjson({
     database:database.getName(),
     collection:info?.name ?? null,
     isTimeSeries:Boolean(info?.options?.timeseries),
     timeField:info?.options?.timeseries?.timeField ?? null
   });'
```

The expected namespace for laboratory 01 is:

```text
playground.fast_start_events
```

## 7. Create the Stream Processor

The timestamp normalization preserves valid BSON dates and converts valid ISO
timestamp strings. It uses `$dateFromString` only as a fallback for missing or
invalid timestamps. Do not use `$$NOW` in this playground processor.

Generate the processor definition:

```bash
jq -n \
  --arg name "$PROCESSOR" \
  --arg db "$DATABASE_NAME" \
  --arg coll "$COLLECTION_NAME" \
  '{
    name:$name,
    pipeline:[
      {"$source":{connectionName:"sample_stream_solar"}},
      {"$set":{
        timestamp:{
          "$cond":[
            {"$eq":[{"$type":"$timestamp"},"date"]},
            "$timestamp",
            {"$dateFromString":{
                "dateString":"$timestamp",
                "onError":{"$dateFromString":{"dateString":"2026-09-11T00:00:00Z"}},
                "onNull":{"$dateFromString":{"dateString":"2026-09-11T00:00:00Z"}}
            }}
          ]
        }
      }},
      {"$emit":{
        connectionName:"atlas_lab",
        db:$db,
        coll:$coll,
        timeseries:{timeField:"timestamp"}
      }}
    ]
  }' > "$EVIDENCE_DIR/processor.json"
```

Create the processor:

```bash
atlas api streams createStreamProcessor \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --file "$EVIDENCE_DIR/processor.json" \
  --output json > "$EVIDENCE_DIR/processor-created.json"
```

## 8. Start and Validate the Processor

Start the processor:

```bash
atlas api streams startStreamProcessor \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --processorName "$PROCESSOR" \
  --output json > "$EVIDENCE_DIR/processor-start.json"
```

Save and inspect its status:

```bash
atlas api streams getStreamProcessor \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --processorName "$PROCESSOR" \
  --output json > "$EVIDENCE_DIR/processor-status.json"

jq '{name, state, tier, stats: {
  inputMessageCount,
  outputMessageCount,
  dlqMessageCount,
  operatorStats
}}' "$EVIDENCE_DIR/processor-status.json"
```

A successful run should show:

- `state`: `STARTED`
- `outputMessageCount`: greater than zero
- `dlqMessageCount`: `0`

Validate sink delivery:

```bash
mongosh "$ATLAS_URI" --quiet --eval \
  "print(db.getSiblingDB('${DATABASE_NAME}').${COLLECTION_NAME}.countDocuments({}))" \
  | tee "$EVIDENCE_DIR/sink-count.txt"
```

## 9. Update an Existing Processor

A running processor cannot be modified. Stop it first and verify the lifecycle state:

```bash
atlas api streams stopStreamProcessor \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --processorName "$PROCESSOR" \
  --output json > "$EVIDENCE_DIR/processor-stop.json"

atlas api streams getStreamProcessor \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --processorName "$PROCESSOR" \
  --output json > "$EVIDENCE_DIR/processor-status-stopped.json"
```

The update sequence is:

```text
STOPPED -> update -> STARTED
```

Update and restart:

```bash
atlas api streams updateStreamProcessor \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --processorName "$PROCESSOR" \
  --file "$EVIDENCE_DIR/processor.json" \
  --output json > "$EVIDENCE_DIR/processor-updated.json"

atlas api streams startStreamProcessor \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --processorName "$PROCESSOR" \
  --output json > "$EVIDENCE_DIR/processor-start.json"
```

## 10. Operational Logs

Download processor operational logs for troubleshooting:

```bash
NOW=$(date +%s)
START=$((NOW - 3600))

atlas api streams downloadOperationalLogs \
  --version 2025-03-12 \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --spName "$PROCESSOR" \
  --startDate "$START" \
  --endDate "$NOW" \
  --output gzip \
  --outputFile "$EVIDENCE_DIR/processor-operational-logs.gz"

gzip -dc "$EVIDENCE_DIR/processor-operational-logs.gz" \
  > "$EVIDENCE_DIR/processor-operational-logs.txt"
```

Inspect a redacted summary locally:

```bash
grep -Ein 'error|exception|failed|dlq|timeseries|emit|unauthorized|forbidden|permission' \
  "$EVIDENCE_DIR/processor-operational-logs.txt"
```

Review logs before sharing them. They may contain project, processor, host, or customer-related information.

## 11. Cleanup

Stop and delete the processor, connections, and workspace after the test:

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

atlas api streams deleteStreamConnection \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --connectionName "sample_stream_solar" \
  --output json

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

Verify that the workspace no longer exists:

```bash
atlas api streams getStreamWorkspace \
  --groupId "$PROJECT_ID" \
  --tenantName "$WORKSPACE" \
  --output json
```

A non-zero response after deletion is expected. Keep the local evidence directory, but do not commit it.

## 12. Common Failure Modes

| Symptom | Likely cause | Action |
|---|---|---|
| `INVALID_JSON_ATTRIBUTE` for `dataProcessRegion` | Unsupported API version or region exposure | Use the CLI default version and the literal cloud region value |
| Processor reaches `STARTED` but output is zero | Sink configuration, collection type, or pipeline error | Inspect processor stats and operational logs |
| Messages go to the DLQ in `$set` | Unsupported expression or invalid timestamp | Use the tested `$dateFromString` fallback |
| `$emit` rejects the sink | Collection is missing or is not time series | Create the collection with `timestamp` as `timeField` |
| Processor update is rejected | Processor is still running | Stop it, verify `STOPPED`, update, then start |
| Workspace remains after cleanup | Delete request is asynchronous or failed | Check the `cleanup-*.error` files and poll the workspace status |

## Sources

- [Atlas Stream Processing workspace management](https://www.mongodb.com/docs/atlas/atlas-stream-processing/manage-processing-instance/)
- [Create Stream Workspace API, version 2025-02-19](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/2025-02-19/operation/operation-creategroupstreamworkspace)
- [Atlas Stream Processing operators](https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-operators/)
- [$emit aggregation stage](https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-emit/)
- [Atlas CLI documentation](https://www.mongodb.com/docs/atlas/cli/current/)
