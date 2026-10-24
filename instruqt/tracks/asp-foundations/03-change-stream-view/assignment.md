---
slug: change-stream-view
id: czkrv7oadi8y
type: challenge
title: Lab 02 - Change Stream delivery view
teaser: Build a materialized view of the latest delivery state.
notes:
- type: text
  contents: Change Streams report changes after the processor starts. Insert fresh
    test events during this exercise.
tabs:
- id: qansjsll4vvp
  title: Terminal
  type: terminal
  hostname: workstation
  workdir: /opt/asp-playground
difficulty: ""
enhanced_loading: null
---

# Lab 02: Change Stream delivery view

## Outcome

Observe MongoDB Change Stream events and maintain the latest state for each delivery in a materialized view.

## 1. Start the processor

In the ASP shell, load and start the processor before inserting records:

```bash
./instruqt/tracks/asp-foundations/bin/asp-shell
```

```javascript
load("/opt/asp-playground/projects/02-taco-tracking/processor.js")
sp.labTacoTracking.start()
sp.labTacoTracking.stats()
```

## 2. Insert fresh test events

Use the test-cluster shell (`./instruqt/tracks/asp-foundations/bin/atlas-shell`) and insert two new documents into `playground.taco_events`. Use `delivery_id`, `dist`, a BSON `Date` in `timestamp`, and `status`:

```javascript
use playground
db.taco_events.insertMany([
  { delivery_id: "taco-001", dist: 1200, timestamp: new Date(), status: "on_route" },
  { delivery_id: "taco-002", dist: 850, timestamp: new Date(), status: "preparing" }
])
```

Then update `taco-001` with `dist: 400` and `status: "delivered"`:

```javascript
db.taco_events.updateOne(
  { delivery_id: "taco-001" },
  { $set: { dist: 400, timestamp: new Date(), status: "delivered" } }
)
```

After the one-minute window advances, update another record to move the watermark and allow the window to emit:

```javascript
db.taco_events.updateOne(
  { delivery_id: "taco-002" },
  { $set: { timestamp: new Date() } }
)
```

## 3. Verify the view

Run:

```bash
./instruqt/tracks/asp-foundations/bin/check-lab02
```

The check expects `playground.taco_locations` to contain `_id: "taco-001"`, `dist: 400`, and `status: "delivered"`.

## Cleanup

Stop and drop `labTacoTracking`. Remove only this participant's `taco_events` and `taco_locations` data when the participant's Atlas project is dedicated to this track. Do not drop shared databases or clusters.
