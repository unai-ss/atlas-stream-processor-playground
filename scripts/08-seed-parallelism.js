const database = db.getSiblingDB("playground");
const runId = "run-001";
const eventCount = 100;
const entities = ["sensor-a", "sensor-b", "sensor-c", "sensor-d"];
const startedAt = new Date();

const events = Array.from({ length: eventCount }, (_, index) => {
  const entityId = entities[index % entities.length];
  return {
    run_id: runId,
    entity_id: entityId,
    sequence: Math.floor(index / entities.length) + 1,
    partition_key: entityId,
    value: (index % 20) + 1,
    observed_at: new Date(startedAt.getTime() + index),
    change_version: 1
  };
});

database.parallelism_input.insertMany(events);
print(`Inserted ${events.length} events for ${runId}`);

entities.forEach((entityId, index) => {
  database.parallelism_input.updateOne(
    { run_id: runId, entity_id: entityId, sequence: 1 },
    {
      $set: {
        value: 100 + index,
        change_version: 2,
        updated_at: new Date()
      }
    }
  );
});

print(`Updated ${entities.length} events for ${runId}`);
