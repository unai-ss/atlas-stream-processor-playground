---
slug: sample-to-atlas
type: challenge
title: Lab 01 - Sample to Atlas
teaser: Inspect Sample events and persist a normalized stream to Atlas.
notes:
  - type: text
    contents: Use only the participant's test workspace and test cluster. Do not use production data.
tabs:
  - title: Terminal
    type: terminal
    hostname: kafka
    workdir: /opt/asp-playground
---

# Lab 01: Sample to Atlas

## Outcome

Inspect `sample_stream_solar`, run a persistent processor, normalize the timestamp, and verify that valid events reach an Atlas time-series collection.

## 1. Inspect the source

Open the ASP shell:

```bash
./instruqt/tracks/asp-foundations/bin/asp-shell
```

Run a temporary source query:

```javascript
sp.process([{ $source: { connectionName: "sample_stream_solar" } }])
```

Stop it with `Ctrl-C`.

## 2. Create and run the processor

The processor definition is in:

```text
/opt/asp-playground/projects/01-fast-start/processor.js
```

Load and start it in the ASP shell:

```javascript
load("/workspace/projects/01-fast-start/processor.js")
sp.labFastStart.start()
sp.labFastStart.stats()
sp.labFastStart.sample()
```

## 3. Verify persisted output

From another terminal command, check the test sink:

```bash
./instruqt/tracks/asp-foundations/bin/check-lab01
```

The sink must contain at least one document with a BSON date in `timestamp`.

## Cleanup

Stop and drop only `labFastStart` when finished:

```javascript
sp.labFastStart.stop()
sp.labFastStart.drop()
```

Do not delete the cluster, workspace, or shared connections.
