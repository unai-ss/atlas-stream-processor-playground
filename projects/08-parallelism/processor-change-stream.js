const source = {
  $source: {
    connectionName: "atlas_lab",
    db: "playground",
    coll: "parallelism_input",
    config: { fullDocument: "updateLookup" }
  }
};

const filterAndProject = [
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
      run_id: { $type: "string" },
      entity_id: { $type: "string" },
      sequence: { $type: "number" },
      partition_key: { $type: "string" },
      value: { $type: "number" },
      observed_at: { $type: "date" }
    }
  },
  {
    $project: {
      _id: 0,
      run_id: 1,
      entity_id: 1,
      sequence: 1,
      partition_key: 1,
      value: 1,
      observed_at: 1,
      change_version: 1
    }
  },
  {
    $set: {
      etl_stage: "transform",
      value_squared: { $multiply: ["$value", "$value"] },
      value_cubed: {
        $multiply: [
          { $multiply: ["$value", "$value"] },
          "$value"
        ]
      },
      value_x10: { $multiply: ["$value", 10] },
      value_plus_offset: { $add: ["$value", 42] },
      value_score: {
        $add: [
          { $multiply: ["$value", "$value"] },
          { $multiply: ["$value", 10] },
          42
        ]
      }
    }
  }
];

let transformWorkExpression = "$value";
for (let step = 1; step <= 20; step += 1) {
  transformWorkExpression = {
    $add: [
      { $multiply: [transformWorkExpression, 2] },
      step
    ]
  };
}

const transformPipeline = [
  ...filterAndProject,
  {
    $set: {
      transform_work: transformWorkExpression
    }
  }
];

const serialPipeline = [
  source,
  ...transformPipeline,
  {
    $emit: {
      connectionName: "atlas_lab",
      db: "playground",
      coll: "parallelism_serial_output",
      timeseries: { timeField: "observed_at" },
      parallelism: 1
    }
  }
];

const parallelPipeline = [
  source,
  ...transformPipeline,
  {
    $emit: {
      connectionName: "atlas_lab",
      db: "playground",
      coll: "parallelism_parallel_output",
      timeseries: { timeField: "observed_at" },
      parallelism: 2
    }
  }
];

sp.createStreamProcessor("labParallelismSerial", serialPipeline, {
  dlq: {
    connectionName: "atlas_lab",
    db: "playground",
    coll: "parallelism_serial_dlq"
  }
});

sp.createStreamProcessor("labParallelismWorkers", parallelPipeline, {
  dlq: {
    connectionName: "atlas_lab",
    db: "playground",
    coll: "parallelism_parallel_dlq"
  }
});
