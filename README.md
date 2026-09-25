# Atlas Stream Processing Playground

Educational Atlas Stream Processing playground with repeatable labs, operational
guidance, and an automated assessment track.

For the Spanish learning path and shared setup steps, see
[LABS.md](LABS.md). For the complete CLI workflow, see
[ASP_OPERATIONS_GUIDE.md](ASP_OPERATIONS_GUIDE.md).

## Labs and Options

Choose the path that matches the capability you want to practice:

| Path | Labs | External services |
|---|---|---|
| ASP core | 01 Sample, 02 Change Streams, 03 Ruuvi | Atlas only |
| Operations | 07 observability, 08 ETL parallelism | Atlas only |
| Integrations | 04 late-data join, 05 HTTP enrichment, 06 CDC to Kinesis | Kafka, HTTP, or AWS as applicable |
| Setup and assessment | 00 infrastructure and automated assessment | Controlled fixtures and adapters |

Prepare infrastructure once with laboratory 00, then run the pipeline labs
manually from `mongosh`. Laboratory 00 also defines the
contract for a non-interactive automated runner. Every lab has its own README;
laboratories 00, 01, 02, and 08 also include repeatable setup guidance.

## Project Catalog

| Proyecto | Autor |
|---|---|
| [Infrastructure and automated playground assessment](projects/00-assessment) | MongoDB playground |
| [Fast start with Sample source](projects/01-fast-start) | Kenny Gorman |
| [Taco delivery tracking](projects/02-taco-tracking) | Kenny Gorman |
| [Ruuvi motion aggregation](projects/03-ruuvi-motion) | Kenny Gorman |
| [Sensor join with late data repair](projects/04-late-data-join) | Joseph Niemiec |
| [IP traffic HTTP enrichment](projects/05-http-enrichment) | Kenny Gorman |
| [MongoDB CDC to Kinesis](projects/06-cdc-to-kinesis) | Igor Alekseev / MongoDB |
| [Observability and troubleshooting](projects/07-metrics-observability) | MongoDB playground |
| [Parallelism across ETL: Sample and Change Stream](projects/08-parallelism) | MongoDB playground |

Each folder contains a lab and a JavaScript processor to run in a Stream
Processing Instance. These are educational adaptations, not official copies of
the referenced authors' work.

## Safety Rules

- Use a dedicated Atlas test project.
- Never use production data.
- Copy `.env.example` to `.env` and fill it with local values.
- Never commit `.env`, credentials, screenshots, raw logs, or generated evidence.
- Keep `CLEANUP=true` unless resources are being retained for an approved investigation.

## Setup

Antes de ejecutar cualquier comando de Atlas, asegúrate de haberte registrado
en la consola con `atlas auth login` y confirma la sesión con:

```bash
atlas auth whoami
```

Si la sesión ha caducado, vuelve a ejecutar `atlas auth login`.

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

Antes de usar cualquier `ATLAS_URI`, ejecuta el preflight común:

```bash
source .env
./scripts/validate-atlas-connection.sh
```

El preflight detecta si el cluster se recreó y la URI local conserva un
hostname antiguo.

Known limitations and the recommended work order are tracked in [LIMITATIONS.md](LIMITATIONS.md).

## Initial Experiment Scope

The initial matrix is defined in `target-regions.txt`:

- GCP `us-west1`
- Azure `southeastasia`
- Azure `northeurope`
- Azure `eastasia`

GCP `asia-south1` is not included because it was unavailable during the readiness assessment. Add it only after availability is confirmed for the target project and API version.

The default example configuration uses an `SP2` tier, `playground` as the
database, and `CLEANUP=true`. Adjust `PROVIDER`, `REGION`, `TIER`, and
`MAX_TIER` for the selected workspace, and keep credentials in the local
`.env` file only.

## Choose a Workflow

- **Prepare once:** complete laboratory 00 and validate the shared workspace,
  connections, permissions, and cluster.
- **Learn the core:** follow laboratories 01, 02, and 03 in order; create and
  inspect documents in the cluster from the pipeline exercises.
- **Inspect operations:** use 07 for state, counters, samples, sink delivery,
  DLQ, and logs; then use 08 first with Sample and next with the reproducible
  Change Stream mode.
- **Practice integrations:** continue with 04, 05, and 06 after the core path;
  each one requires the corresponding external service or test adapter.
- **Evaluate a submission:** use 00 for deterministic fixtures, assertions, and
  a redacted JSON report.

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

Use the API version selected by the installed Atlas CLI when creating Stream
Processing workspaces. Do not copy a version pin from an older CLI example;
the CLI may reject it and fall back to another version.

```bash
atlas api streams createStreamWorkspace \
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
