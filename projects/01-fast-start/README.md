# Lab 01: First Pipeline with Sample

Reference author: Kenny Gorman.

Source: https://medium.com/mongodb/the-fastest-way-to-try-atlas-stream-processing-43cd7e0cfe1e

Related official documentation: https://www.mongodb.com/docs/atlas/atlas-stream-processing/quickstart

**Overview:** Observe events from `sample_stream_solar` and create a persistent
processor that writes them to an Atlas collection.

Prepare the infrastructure once in [Lab 00](../00-assessment/). This lab focuses
on the pipeline, its lifecycle, and the documents written to the cluster.

## Objective

Build your first Atlas Stream Processing pipeline in two steps: verify that a
source emits events, then persist those events to an Atlas collection with a
managed processor.

## ASP Concepts

- `Sample` connection and `$source` stage;
- temporary inspection with `sp.process()`;
- persistent processors and the `start`, `stats`, `sample`, `stop`, and `drop` lifecycle;
- `timestamp` normalization before writing to a time-series collection;
- the `$emit` stage for an Atlas sink.

## Architecture

```text
sample_stream_solar
		-> $source
		-> $set (timestamp)
		-> $emit
		-> playground.fast_start_events
```

## Prerequisites

Before continuing, run `atlas auth login` in the terminal and verify the
session with `atlas auth whoami`. If the session has expired, run
`atlas auth login` again.

If the workspace or any connection has not been created, first follow the
[Lab 00 infrastructure manual](../00-assessment/MANUAL.md). This lab does not
create clusters, users, or workspaces.

Before using `ATLAS_URI`, run `./scripts/validate-atlas-connection.sh` from the
project root to detect an outdated hostname.

The Stream Processing workspace typically includes the `Sample` connection
`sample_stream_solar`. If it does not appear in `sp.listConnections()`, add it
before continuing.

You will need:

- a test Stream Processing workspace;
- `mongosh` access to that workspace;
- `mongosh` version 2.0 or later;
- an Atlas connection named `atlas_lab`;
- the `playground.fast_start_events` collection configured as a time-series
  collection with `timestamp` as its `timeField`.

To access the Atlas cluster, use the URI that already contains the credentials
for `stream[redacted]`:

```bash
mongosh "$ATLAS_URI"
```

The ASP workspace connection uses its hostname and remains separate from
`ATLAS_URI`.

The first step does not require loading `processor.js`.

## Step 1: Inspect the Source

While connected to the Stream Processing workspace, run a temporary processor:

```javascript
sp.process([
	{
		$source: {
			connectionName: "sample_stream_solar"
		}
	}
])
```

You should see documents similar to:

```javascript
{
	device_id: "device_8",
	group_id: 7,
	timestamp: "2024-08-12T21:41:01.788+00:00",
	max_watts: 450,
	event_type: 0,
	obs: { watts: 252, temp: 17 }
}
```

Stop the temporary run with `Ctrl-C`. This processor is not saved to the
workspace and does not create persistent resources.

## Step 2: Create the Persistent Processor

Load the definition from `mongosh` connected to the workspace:

```javascript
load("[local-repository]/projects/01-fast-start/processor.js")
```

The file creates `labFastStart` with these stages:

1. `$source` reads from `sample_stream_solar`.
2. `$set` converts the Sample ISO timestamp to a date and uses a fixed fallback
   only when the value is missing or cannot be converted.
3. `$emit` writes to `playground.fast_start_events` through `atlas_lab`.

Start and monitor the processor:

```javascript
sp.labFastStart.start()
sp.labFastStart.stats()
sp.labFastStart.sample()
```

`stats()` confirms operational activity, and `sample()` displays a sample of
processed documents in the console.

## Verify the Sink

From a connection to the Atlas cluster, verify that documents have arrived:

```javascript
use playground
db.fast_start_events.findOne()
```

The output should contain a date-type `timestamp` and Sample event fields such
as `device_id`, `obs.watts`, and `obs.temp`:

```javascript
db.fast_start_events.findOne({ timestamp: { $type: "date" } })
db.fast_start_events.countDocuments()
```

The count should be greater than zero, and the timestamp should match the
received event except for messages without a valid timestamp.

## Cleanup

When you finish the lab, stop and remove the persistent processor:

```javascript
sp.labFastStart.stop()
sp.labFastStart.drop()
sp.listStreamProcessors()
```

`drop()` is permanent. Remove the sink collection and workspace by following
the general cleanup procedure in [ASP_OPERATIONS_GUIDE.md](../../ASP_OPERATIONS_GUIDE.md).

## Optional Exercise

Modify the pipeline to retain only events where `obs.watts` is greater than
200. Verify the filter using `sample()` and a query against the sink.

This lab is a local adaptation of the referenced article and is not official
code from the author.
