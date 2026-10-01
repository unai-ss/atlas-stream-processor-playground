# Lab 02: Delivery Tracking with Change Streams

Reference author: Kenny Gorman.

Source: https://medium.com/mongodb/locating-tacos-with-atlas-stream-processing-or-streaming-etl-with-mongodb-8b43b4d6ae54

**Overview:** Read changes from `taco_events`, group deliveries into windows,
and maintain a materialized view of the latest position.

Prepare the shared infrastructure in [Lab 00](../00-assessment/). This lab
focuses on creating documents in Atlas, monitoring the Change Stream, and
maintaining the delivery view.

## Objective

Transform changes from an Atlas collection into a materialized view containing
the latest known position for each delivery.

## ASP Concepts

- `$source` with an Atlas connection and Change Streams;
- `fullDocument: "updateLookup"` para recuperar el documento posterior en
	eventos `update`;
- filtering `insert`, `update`, and `replace` operations;
- ventanas `$tumblingWindow`;
- selecting the latest event with `$top`;
- `$merge` to maintain one view per `delivery_id`.

## Architecture
```text
Atlas Change Stream -> 1-minute window -> $group by delivery_id
                    -> $top by timestamp -> $merge
                    -> playground.taco_locations
```

## Prerequisites

Before continuing, run `atlas auth login` in the terminal and verify the
session with `atlas auth whoami`. If the session has expired, run
`atlas auth login` again.

First, verify the infrastructure described in the [Lab 00 manual](../00-assessment/MANUAL.md).
Do not recreate the cluster, user, or workspace here.

Before using `ATLAS_URI`, run `./scripts/validate-atlas-connection.sh` from the
project root to detect an outdated hostname.

You will need:

- the same ASP workspace and `atlas_lab` Atlas connection used in Lab 01;
- a test Atlas cluster;
- `mongosh` access to the workspace and cluster;
- the `playground.taco_events` collection.

To connect to the Atlas cluster, use the full URI, which includes the
credentials for `stream[redacted]`:

```bash
mongosh "$ATLAS_URI"
```

To connect to the ASP workspace, use its `ASP_HOST` hostname; this is a
different endpoint from the Atlas cluster. Run the [manual's preflight](MANUAL.md)
before loading the processor. If infrastructure or connections are missing,
complete [Lab 00](../00-assessment/MANUAL.md).

`$merge` may create `playground.taco_locations` during the first window.

## Step 1: Generate Events
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

Each insert generates a Change Stream event. Documents that existed before the
processor started are not replayed automatically.

## Step 2: Inspect the Change Stream

Before starting the persistent processor, connect `mongosh` to the ASP
workspace and run:

```javascript
sp.process([
	{
		$source: {
			connectionName: "atlas_lab",
			db: "playground",
			coll: "taco_events",
			config: { fullDocument: "updateLookup" }
		}
	}
])
```

While the command is running, insert another event and inspect its
`operationType` and `fullDocument`. Stop the temporary processor with `Ctrl-C`.

## Step 3: Create the Materialized View

Reconnect to the ASP workspace and load the processor:

```javascript
load("[local-repository]/projects/02-taco-tracking/processor.js")
sp.labTacoTracking.start()
sp.labTacoTracking.stats()
sp.labTacoTracking.sample()
```

The processor groups events into one-minute windows and retains, for each
`delivery_id`, the event with the latest timestamp in the window.

When a processor is recreated, events from before its start are not replayed.
Use new events for testing. A window is emitted when the watermark advances to
a later window; without later events, the output may continue to show the
previous window's state.

## Step 4: Update a Delivery

Update a delivery from the Atlas cluster:

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

After the next minute begins, generate a later event to advance the watermark:

```javascript
db.taco_events.updateOne(
	{ delivery_id: "taco-002" },
	{ $set: { timestamp: new Date() } }
)
```

Documents without `delivery_id` or a date-type `timestamp` are discarded to
prevent output with `_id: null`.

After the one-minute window closes, query the view:

```javascript
db.taco_locations.find().sort({ _id: 1 }).pretty()
```

There should be one document per delivery, containing `dist`, `updated_at`, and
`status`.

## Verification

Confirm that the view contains the latest state:

```javascript
db.taco_locations.countDocuments()
db.taco_locations.findOne({ _id: "taco-001" })
```

The count should be greater than zero, and `taco-001` should show `dist: 400`
and `status: "delivered"` after the window closes.

## Cleanup

From the ASP workspace:

```javascript
sp.labTacoTracking.stop()
sp.labTacoTracking.drop()
sp.listStreamProcessors()
```

From the Atlas cluster, remove the lab collections if they are no longer
needed:

```javascript
use playground
db.taco_events.drop()
db.taco_locations.drop()
```

## Optional Exercises

1. Change the window from one minute to ten seconds.
2. Ignore deliveries with `status: "cancelled"`.
3. Add an event counter for each delivery.
4. Insert an event with an older timestamp and observe why `$top` does not
   select it as the latest state.

This lab is a local adaptation of the referenced article and is not official
code from the author.
