const pipeline = [
  {
    $source: {
      connectionName: "atlas_lab",
      db: "playground",
      coll: "taco_events",
      config: { fullDocument: "updateLookup" }
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
      delivery_id: { $type: "string" },
      timestamp: { $type: "date" }
    }
  },
  {
    $tumblingWindow: {
      interval: { size: 1, unit: "minute" },
      pipeline: [
        {
          $group: {
            _id: "$delivery_id",
            latest: {
              $top: {
                output: {
                  dist: "$dist",
                  timestamp: "$timestamp",
                  status: "$status"
                },
                sortBy: { timestamp: -1 }
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            dist: "$latest.dist",
            updated_at: "$latest.timestamp",
            status: "$latest.status"
          }
        }
      ]
    }
  },
  {
    $merge: {
      into: {
        connectionName: "atlas_lab",
        db: "playground",
        coll: "taco_locations"
      },
      on: ["_id"],
      whenMatched: "merge",
      whenNotMatched: "insert"
    }
  }
];

sp.createStreamProcessor("labTacoTracking", pipeline);
