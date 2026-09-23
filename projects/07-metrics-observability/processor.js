const pipeline = [
  {
    $source: {
      connectionName: "sample_stream_solar"
    }
  },
  {
    $match: {
      device_id: { $type: "string" },
      "obs.watts": { $type: "number" }
    }
  },
  {
    $set: {
      value: "$obs.watts",
      source: "sample_stream_solar",
      processed_at: "$$NOW",
      lab: "metrics-observability",
      observed_at: {
        $cond: [
          { $eq: [{ $type: "$timestamp" }, "date"] },
          "$timestamp",
          {
            $dateFromString: {
              dateString: "$timestamp",
              onError: {
                $dateFromString: { dateString: "2026-09-11T00:00:00Z" }
              },
              onNull: {
                $dateFromString: { dateString: "2026-09-11T00:00:00Z" }
              }
            }
          }
        ]
      }
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
