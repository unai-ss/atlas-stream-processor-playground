# USS Atlas Stream Processing TSE Lab

## Purpose

Prepare a hands-on Instruqt track for Atlas Stream Processing using Labs 00, 01, 02, and 08. The `ubuntu-22-04` workstation setup installs Atlas CLI, `mongosh`, and `jq`, then downloads pinned runtime source files from the public GitHub repository. The track does not use Docker, a Kafka broker, or inbound network access.

## Proposed learner flow

| Order | Lab | Learner outcome | Source material |
|---|---|---|---|
| 1 | 00: Environment readiness | Confirm the participant's test Atlas project, ASP workspace, connections, and permissions are ready. | [Lab 00 assignment](01-environment-readiness/assignment.md) |
| 2 | 01: Sample to Atlas | Inspect Sample events, run a persistent processor, normalize timestamps, and verify sink output. | [Processor snapshot](../../projects/01-fast-start/processor.js) |
| 3 | 02: Change Stream view | Observe change events and maintain the latest delivery state in a materialized view. | [Processor snapshot](../../projects/02-taco-tracking/processor.js) |
| 4 | 08: ETL parallelism | Compare serial and parallel sink processing with a controlled Change Stream workload. | [Processor snapshot](../../projects/08-parallelism/processor-change-stream.js) |

Detailed adaptation briefs are in [`labs/`](labs/).

## Environment decisions required

- Have each learner use Atlas CLI from the sandbox VM to provision resources in a dedicated, non-production Atlas project during Lab 00.
- Keep Atlas connection URIs in a permission-restricted, per-sandbox file; do not configure them as shared Instruqt team secrets.
- Use a dedicated ASP workspace per learner.
- Use Instruqt's stock `ubuntu-22-04` VM preset; packages and runtime files are installed at sandbox startup.
- Set resource quotas, time limits, cleanup ownership, and recovery behavior for interrupted runs.
- Do not enable external ingress or TLS certificate provisioning; the learner tools make outbound connections to Atlas only.

## Lab adaptation contract

Each lab should specify prerequisites, learner steps, deterministic success criteria, a verification procedure, and cleanup behavior. Verification should inspect observable outcomes rather than rely only on a processor reporting `STARTED`. Cleanup must be scoped to resources created for that learner's run.

## Publication status

Draft implementation for the `mongodb-ts-dev` Instruqt organization. Lab 00 is responsible for learner-driven Atlas provisioning with Atlas CLI; the startup script installs tools and fetches pinned runtime source but does not create Atlas resources. A real end-to-end sandbox run requires outbound HTTPS to package repositories, GitHub, and Atlas, plus a dedicated non-production Atlas project and ASP workspace per learner. Do not publish for concurrent use until resource isolation and cleanup have been verified.

## Timing and rollout

Keep the four challenges together for the first measured rollout. Lab 00 remains an explicit provisioning phase. Measure cold VM setup, Atlas provisioning, and learner exercise time separately. The current 20-minute track limit is provisional: choose a supported limit from the measured full learner flow before release. Do not enable hot starts or split Lab 00 into a second track until resource handoff, secret handling, and cleanup across sandboxes have been designed and tested.
