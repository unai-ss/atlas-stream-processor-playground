const database = db.getSiblingDB("playground");
const runId = typeof SEED_RUN_ID === "string" ? SEED_RUN_ID : "run-001";
const eventCount = Number.isInteger(SEED_EVENT_COUNT) ? SEED_EVENT_COUNT : 100;
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
const finishedAt = new Date();
printjson({
  runId,
  eventCount,
  startedAt,
  finishedAt,
  seedDurationMs: finishedAt.getTime() - startedAt.getTime()
});
