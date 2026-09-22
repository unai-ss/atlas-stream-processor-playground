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
      sequence: { $type: "number" },
      worker_demo: { $type: "string" },
      value: { $type: "number" },
      observed_at: { $type: "date" }
    }
  },
  {
    $project: {
      _id: 1,
      sequence: 1,
      worker_demo: 1,
      value: 1,
      observed_at: 1
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
