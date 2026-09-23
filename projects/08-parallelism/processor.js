const source = {
  $source: {
    connectionName: "sample_stream_solar"
  }
};

const filterAndProject = [
  {
    $match: {
      device_id: { $type: "string" },
      "obs.watts": { $type: "number" }
    }
  },
  {
    $project: {
      _id: 1,
      device_id: 1,
      entity_id: "$device_id",
      value: "$obs.watts",
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
      },
      source: { $literal: "sample_stream_solar" }
    }
  },
  {
    $set: {
      etl_stage: "transform",
      transformed_at: "$$NOW",
      value_squared: { $multiply: ["$value", "$value"] }
    }
  }
];

const serialPipeline = [
  source,
  ...filterAndProject,
  {
    $emit: {
      connectionName: "atlas_lab",
      db: "playground",
      coll: "parallelism_serial_output",
      parallelism: 1
    }
  }
];

const parallelPipeline = [
  source,
  ...filterAndProject,
  {
    $emit: {
      connectionName: "atlas_lab",
      db: "playground",
      coll: "parallelism_parallel_output",
      parallelism: 2
    }
  }
];

sp.createStreamProcessor("labParallelismSerial", serialPipeline);
sp.createStreamProcessor("labParallelismWorkers", parallelPipeline);
