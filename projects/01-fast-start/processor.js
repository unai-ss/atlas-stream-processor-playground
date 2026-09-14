const pipeline = [
  {
    $source: {
      connectionName: "sample_stream_solar"
    }
  },
  {
    $set: {
      timestamp: {
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
    $emit: {
      connectionName: "atlas_lab",
      db: "playground",
      coll: "fast_start_events",
      timeseries: { timeField: "timestamp" }
    }
  }
];

sp.createStreamProcessor("labFastStart", pipeline);
