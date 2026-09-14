const pipeline = [
  {
    $source: {
      connectionName: "atlas_lab",
      db: "playground",
      coll: "device_events",
      config: { fullDocument: "whenAvailable" }
    }
  },
  {
    $match: {
      operationType: { $in: ["insert", "update", "replace"] }
    }
  },
  {
    $replaceRoot: {
      newRoot: {
        $mergeObjects: [
          "$fullDocument",
          { _operationType: "$operationType" }
        ]
      }
    }
  },
  {
    $project: {
      _id: 0,
      device_id: 1,
      timestamp: 1,
      watts: "$obs.watts",
      temp: "$obs.temp",
      _operationType: 1
    }
  },
  {
    $emit: {
      connectionName: "kinesis_lab",
      stream: "atlas-change-events",
      region: "us-east-1",
      partitionKey: "$device_id"
    }
  }
];

sp.createStreamProcessor("labCdcKinesis", pipeline);
