const pipeline = [
  {
    $source: {
      connectionName: "atlas_lab",
      db: "playground",
      coll: "metrics_input",
      config: { fullDocument: "whenAvailable" }
    }
  },
  {
    $match: {
      operationType: { $in: ["insert", "replace", "update"] },
      fullDocument: { $ne: null }
    }
  },
  {
    $replaceRoot: {
      newRoot: "$fullDocument"
    }
  },
  {
    $match: {
      device_id: { $type: "string" },
      value: { $type: "number" }
    }
  },
  {
    $set: {
      processed_at: "$$NOW",
      lab: "metrics-observability"
    }
  },
  {
    $merge: {
      into: {
        connectionName: "atlas_lab",
        db: "playground",
        coll: "metrics_output"
      },
      on: ["device_id"],
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
];

sp.createStreamProcessor("labMetricsObservability", pipeline);
