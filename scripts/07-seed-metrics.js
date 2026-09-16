const database = db.getSiblingDB("playground");
const events = [
  { device_id: "device-001", value: 10, status: "ok" },
  { device_id: "device-002", value: 20, status: "ok" },
  { device_id: "device-001", value: 30, status: "ok" },
  { device_id: "device-003", value: "bad-value", status: "invalid-value" },
  { value: 99, status: "missing-device" },
  { device_id: "device-004", value: 40, status: "ok" }
];

print("Metrics seed started");

events.forEach((event, index) => {
  database.metrics_input.insertOne({
    ...event,
    sequence: index + 1,
    created_at: new Date(),
    source: "playground-seed"
  });
  print(`Inserted metrics event ${index + 1}/${events.length}`);
  if (index < events.length - 1) {
    sleep(1000);
  }
});

print("Metrics seed finished");
