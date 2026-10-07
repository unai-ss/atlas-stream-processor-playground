---
slug: etl-parallelism
id: pagp2ci5a9vv
type: challenge
title: Lab 08 - ETL parallelism
teaser: Compare serial and parallel sink processing with a controlled workload.
notes:
- type: text
  contents: Validate output and DLQ before comparing throughput. Results are specific
    to this workspace and run.
tabs:
- id: b1j2bypvvzrj
  title: Terminal
  type: terminal
  hostname: kafka
  workdir: /opt/asp-playground
difficulty: ""
enhanced_loading: null
---

# Lab 08: ETL parallelism

## Outcome

Compare `parallelism: 1` and `parallelism: 2` on the Atlas sink while separating functional correctness from throughput and ordering guarantees.

## 1. Prepare the test collections

Open the participant's test-cluster shell:

```bash
./instruqt/tracks/asp-foundations/bin/atlas-shell
```

Create the input, output, and DLQ collections if they are not present:

```javascript
use playground
if (!db.getCollectionNames().includes("parallelism_input")) db.createCollection("parallelism_input")
if (!db.getCollectionNames().includes("parallelism_serial_output")) db.createCollection("parallelism_serial_output", { timeseries: { timeField: "observed_at" } })
if (!db.getCollectionNames().includes("parallelism_parallel_output")) db.createCollection("parallelism_parallel_output", { timeseries: { timeField: "observed_at" } })
if (!db.getCollectionNames().includes("parallelism_serial_dlq")) db.createCollection("parallelism_serial_dlq")
if (!db.getCollectionNames().includes("parallelism_parallel_dlq")) db.createCollection("parallelism_parallel_dlq")
```

The output collections must be time-series collections with `observed_at` as their `timeField`. Confirm any existing collections have that configuration before reusing them.

## 2. Start both processors before seeding

In the ASP shell:

```bash
./instruqt/tracks/asp-foundations/bin/asp-shell
```

```javascript
load("/workspace/projects/08-parallelism/processor-change-stream.js")
sp.labParallelismSerial.start()
sp.labParallelismWorkers.start()
sp.labParallelismSerial.stats()
sp.labParallelismWorkers.stats()
```

Both must be `STARTED` before inserting the controlled batch.

## 3. Seed a unique run

In the test-cluster terminal, seed 100 events. The helper assigns a new run ID to each execution and saves it for the completion check:

```bash
./instruqt/tracks/asp-foundations/bin/seed-parallelism 100
```

The run ID includes your Instruqt participant ID; the seeder also updates one event per entity. Use the same sandbox when checking the run.

## 4. Compare results

Compare both outputs for your `run_id`, including `value`, `value_squared`, and `change_version`. Confirm both DLQs are empty before comparing the time taken to drain the workload. Repeat with larger batch sizes only after cleaning previous run data as directed in the source manual.

Run the completion check:

```bash
./instruqt/tracks/asp-foundations/bin/check-lab08
```

## Cleanup

Stop and drop both processors. Remove only records for your `run_id` and participant-owned test collections. Do not infer global ordering or a universal performance guarantee from one run.
