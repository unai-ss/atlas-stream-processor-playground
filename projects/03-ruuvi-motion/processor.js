const pipeline = [
  {
    $source: {
      connectionName: "atlas_lab",
      db: "playground",
      coll: "ruuvi_sensor_data",
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
      mac_address: { $ne: null },
      "data.acceleration": { $type: "number" }
    }
  },
  {
    $project: {
      mac_address: 1,
      timestamp: {
        $convert: {
          input: "$time",
          to: "date",
          onError: { $dateFromString: { dateString: "2026-09-11T00:00:00Z" } },
          onNull: { $dateFromString: { dateString: "2026-09-11T00:00:00Z" } }
        }
      },
      acceleration: "$data.acceleration"
    }
  },
  {
    $tumblingWindow: {
      interval: { size: 5, unit: "second" },
      pipeline: [
        {
          $group: {
            _id: "$mac_address",
            acceleration: { $max: "$acceleration" },
            timestamp: { $last: "$timestamp" }
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
        coll: "ruuvi_motion"
      },
      on: ["_id"],
      whenMatched: "replace",
      whenNotMatched: "insert"
    }
  }
];

sp.createStreamProcessor("labRuuviMotion", pipeline);
