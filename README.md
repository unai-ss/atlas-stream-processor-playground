# Atlas Stream Processing Playground

Listado de ideas de proyectos de Atlas Stream Processing, con el autor de cada referencia.

| Proyecto | Autor |
|---|---|
| [Fast start with Sample source](projects/01-fast-start) | Kenny Gorman |
| [Taco delivery tracking](projects/02-taco-tracking) | Kenny Gorman |
| [Ruuvi motion aggregation](projects/03-ruuvi-motion) | Kenny Gorman |
| [Sensor join with late data repair](projects/04-late-data-join) | Joseph Niemiec |
| [IP traffic HTTP enrichment](projects/05-http-enrichment) | Kenny Gorman |
| [MongoDB CDC to Kinesis](projects/06-cdc-to-kinesis) | Igor Alekseev / MongoDB |

Cada carpeta contiene un laboratorio y un processor JavaScript para ejecutar en la
consola de un Stream Processing Instance. Son adaptaciones educativas de los
artículos enlazados, no copias oficiales de sus autores.

## Safety Rules

- Use a dedicated Atlas test project.
- Never use production data.
- Copy `.env.example` to `.env` and fill it with local values.
- Never commit `.env`, credentials, screenshots, raw logs, or generated evidence.
- Keep `CLEANUP=true` unless resources are being retained for an approved investigation.

## Setup

```bash
cp .env.example .env
source .env
atlas auth login
atlas --version
jq --version
mongosh --version
```

The required Atlas permissions include the ability to manage Stream Processing workspaces, connections, and processors, plus database permissions to create and query the test sink collection.

For the complete CLI workflow, see [ASP_OPERATIONS_GUIDE.md](ASP_OPERATIONS_GUIDE.md). It covers workspace creation, connections, time-series sink preparation, processor lifecycle, operational logs, validation, and cleanup.

## Initial Experiment Scope

The initial matrix is defined in `target-regions.txt`:

- GCP `us-west1`
- Azure `southeastasia`
- Azure `northeurope`
- Azure `eastasia`

GCP `asia-south1` is not included because it was unavailable during the readiness assessment. Add it only after availability is confirmed for the target project and API version.

## Recommended Experiment Flow

1. Validate the project and cluster configuration.
2. Create a workspace with the selected provider, region, and tier.
3. Create a Sample source connection.
4. Create an Atlas sink connection.
5. Create a dedicated time-series sink collection with `timestamp` as its `timeField`.
6. Create a processor using `$source`, timestamp normalization, and `$emit`.
7. Start the processor and inspect its state and counters.
8. Validate sink delivery and DLQ counts.
9. Save redacted evidence under `readiness-evidence/`.
10. Stop and delete temporary Stream Processing resources.

## Processor Pattern

For Sample messages that do not contain a valid date timestamp, use a supported fallback before writing to a time-series collection:

```json
{
  "$set": {
    "timestamp": {
      "$cond": [
        { "$eq": [{ "$type": "$timestamp" }, "date"] },
        "$timestamp",
        { "$dateFromString": { "dateString": "2026-09-11T00:00:00Z" } }
      ]
    }
  }
}
```

When modifying a processor, use this lifecycle:

```text
STOPPED -> update -> STARTED
```

## API Version Note

The readiness work showed that Azure `northeurope` and `eastasia` required the `2025-02-19` Create Stream Workspace API version. Pin the API version when testing those regions:

```bash
atlas api streams createStreamWorkspace \
  --version 2025-02-19 \
  --groupId "$PROJECT_ID" \
  --file readiness-evidence/workspace.json \
  --output json
```

Use literal Azure region values such as `southeastasia`, `northeurope`, and `eastasia`. Do not substitute general Atlas region identifiers such as `EUROPE_NORTH`, `ASIA_EAST`, or `ASIA_SOUTH_EAST` for this endpoint.

## Sources

- [Atlas Stream Processing workspace management](https://www.mongodb.com/docs/atlas/atlas-stream-processing/manage-processing-instance/)
- [Create Stream Workspace API, version 2025-02-19](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/2025-02-19/operation/operation-creategroupstreamworkspace)
- [Atlas Stream Processing operators](https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-operators/)
- [$emit aggregation stage](https://www.mongodb.com/docs/atlas/atlas-stream-processing/sp-agg-emit/)

## Next Development Step

Add a parameterized `run-playground.sh` script with explicit dry-run, cleanup, evidence-redaction, and per-region result reporting modes.
