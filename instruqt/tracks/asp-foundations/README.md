# USS Atlas Stream Processing TSE Lab

## Purpose

Prepare a hands-on Instruqt track for Atlas Stream Processing using the existing labs 00, 01, 02, 04, and 08. The existing lab documentation and processor files remain the source of truth; this track provides learner-facing steps and Docker-backed Kafka for Lab 04.

## Proposed learner flow

| Order | Lab | Learner outcome | Source material |
|---|---|---|---|
| 1 | 00: Environment readiness | Confirm the participant's test Atlas project, ASP workspace, connections, and permissions are ready. | [`projects/00-assessment`](../../../projects/00-assessment/) |
| 2 | 01: Sample to Atlas | Inspect Sample events, run a persistent processor, normalize timestamps, and verify sink output. | [`projects/01-fast-start`](../../../projects/01-fast-start/) |
| 3 | 02: Change Stream view | Observe change events and maintain the latest delivery state in a materialized view. | [`projects/02-taco-tracking`](../../../projects/02-taco-tracking/) |
| 4 | 04: Late-data join | Read temperature and humidity topics from the per-sandbox Docker Kafka broker and repair late results from a DLQ. | [`projects/04-late-data-join`](../../../projects/04-late-data-join/) |
| 5 | 08: ETL parallelism | Compare serial and parallel sink processing with a controlled Change Stream workload. | [`projects/08-parallelism`](../../../projects/08-parallelism/) |

Detailed adaptation briefs are in [`labs/`](labs/).

## Environment decisions required

- Provide a dedicated, non-production Atlas project and ASP workspace for learner runs.
- Provide a participant-isolated ASP workspace, or a secure automation layer that registers each sandbox's unique Kafka endpoint in that participant's workspace.
- Configure `ASP_URI` and `ATLAS_URI` as Instruqt secrets, but do not reuse one workspace/URI concurrently across learners. Instruqt track secrets are static; multi-participant runs require an external provisioning/injection service that creates isolated Atlas resources or assigns unique workspaces per learner.
- Provide `ASP_URI` and `ATLAS_URI` through per-sandbox secret injection; a shared track-level secret is suitable only for a single controlled learner at a time.
- Set resource quotas, time limits, cleanup ownership, and recovery behavior for interrupted runs.
- Confirm that Atlas can reach each Kafka VM's public DNS endpoint on TCP 9094 and permit the documented Atlas egress addresses at the broker/network layer.
- Set `ATLAS_KAFKA_ALLOWED_CIDRS` to the current Atlas egress CIDRs for the selected ASP workspace region; the host firewall fails closed if it is missing.
- Confirm the Instruqt organization permits Docker on VM hosts, external ingress on high ports, and automatic TLS certificate provisioning.

## Lab adaptation contract

Each lab should specify prerequisites, learner steps, deterministic success criteria, a verification procedure, and cleanup behavior. Verification should inspect observable outcomes rather than rely only on a processor reporting `STARTED`. Cleanup must be scoped to resources created for that learner's run.

## Publication status

Draft implementation for the `mongodb-ts-dev` Instruqt organization. `track.yml`, `config.yml`, the Docker Kafka bootstrap script, helpers, and five challenge assignments are included. Initialize or pull the track in that organization so Instruqt assigns track/challenge IDs, then pin `ASP_PLAYGROUND_REF` to a commit containing this folder. The Instruqt CLI is installed and authenticated; local `instruqt track validate` passes. A full sandbox test still requires `ASP_PLAYGROUND_REF` to resolve to a commit containing these files, dedicated non-production `ASP_URI`/`ATLAS_URI` values, and current Atlas egress CIDRs in `ATLAS_KAFKA_ALLOWED_CIDRS`. This is not ready for concurrent public use until an external provisioning integration supplies participant-isolated resources and registers each sandbox's Kafka endpoint in the correct ASP Connection Registry. Test a real Atlas-to-Kafka connection before publishing.
