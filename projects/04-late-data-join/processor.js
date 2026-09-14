const joinPipeline = [
  {
    $source: {
      connectionName: "kafka_lab",
      topic: ["temperature", "humidity"],
      timeField: { $dateFromString: { dateString: "$timestamp" } },
      partitionIdleTimeout: { size: 5, unit: "second" }
    }
  },
  {
    $tumblingWindow: {
      interval: { size: 30, unit: "second" },
      idleTimeout: { size: 10, unit: "second" },
      allowedLateness: { size: 5, unit: "second" },
      pipeline: [
        {
          $group: {
            _id: "$sensorIdGroup",
            humidity: {
              $top: {
                output: ["$humidity", "$_ts"],
                sortBy: { humidity: -1, _ts: -1 }
              }
            },
            temperature: {
              $top: {
                output: ["$temperature", "$_ts"],
                sortBy: { temperature: -1, _ts: -1 }
              }
            }
          }
        }
      ]
    }
  },
  {
    $project: {
      _id: 1,
      humidity: { $arrayElemAt: ["$humidity", 0] },
      temperature: { $arrayElemAt: ["$temperature", 0] }
    }
  },
  {
    $merge: {
      into: {
        connectionName: "atlas_lab",
        db: "playground",
        coll: "sensor_weather"
      },
      on: ["_id"],
      whenMatched: "merge",
      whenNotMatched: "insert"
    }
  }
];

const dlqPipeline = [
  {
    $source: {
      connectionName: "atlas_lab",
      db: "playground",
      coll: "sensor_dlq"
    }
  },
  {
    $match: {
      operationType: "insert",
      "fullDocument.errInfo.reason": "Input document arrived late."
    }
  },
  {
    $replaceRoot: {
      newRoot: "$fullDocument.doc"
    }
  },
  {
    $set: {
      _id: "$sensorIdGroup"
    }
  },
  {
    $unset: ["sensorIdGroup", "timestamp", "_ts", "_stream_meta"]
  },
  {
    $merge: {
      into: {
        connectionName: "atlas_lab",
        db: "playground",
        coll: "sensor_weather"
      },
      on: ["_id"],
      whenMatched: "merge",
      whenNotMatched: "insert"
    }
  }
];

sp.createStreamProcessor("sensorJoins", joinPipeline, {
  dlq: {
    connectionName: "atlas_lab",
    db: "playground",
    coll: "sensor_dlq"
  }
});
sp.createStreamProcessor("sensorDLQUpdater", dlqPipeline);
