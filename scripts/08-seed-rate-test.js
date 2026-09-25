const database = db.getSiblingDB("playground");
const runId = typeof RATE_TEST_RUN_ID === "string" ? RATE_TEST_RUN_ID : "run-rate-60s";
const eventsPerSecond = 1000;
const durationSeconds = 60;
const entities = ["sensor-a", "sensor-b", "sensor-c", "sensor-d"];
const testStartedAt = new Date();
let sequence = 1;

for (let second = 0; second < durationSeconds; second += 1) {
  const batchStartedAt = new Date();
  const events = Array.from({ length: eventsPerSecond }, (_, index) => {
    const eventNumber = second * eventsPerSecond + index;
    const entityId = entities[eventNumber % entities.length];
    return {
      run_id: runId,
      entity_id: entityId,
      sequence: sequence++,
      partition_key: entityId,
      value: (eventNumber % 20) + 1,
      observed_at: new Date(batchStartedAt.getTime() + index),
      change_version: 1
    };
  });

  database.parallelism_input.insertMany(events, { ordered: false });
  printjson({
    runId,
    second: second + 1,
    insertedThisSecond: events.length,
    insertedTotal: (second + 1) * eventsPerSecond,
    batchFinishedAt: new Date()
  });

  if (second < durationSeconds - 1) {
    sleep(1000);
  }
}

const testFinishedAt = new Date();
printjson({
  runId,
  totalEvents: eventsPerSecond * durationSeconds,
  testStartedAt,
  testFinishedAt,
  sendDurationMs: testFinishedAt.getTime() - testStartedAt.getTime()
});
