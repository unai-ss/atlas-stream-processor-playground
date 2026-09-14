const database = db.getSiblingDB("playground");
const readings = [
  { mac_address: "AA:BB:CC:DD:EE:01", acceleration: 0.8 },
  { mac_address: "AA:BB:CC:DD:EE:02", acceleration: 1.2 },
  { mac_address: "AA:BB:CC:DD:EE:01", acceleration: 2.4 },
  { mac_address: "AA:BB:CC:DD:EE:02", acceleration: 0.6 },
  { mac_address: "AA:BB:CC:DD:EE:01", acceleration: 1.7 },
  { mac_address: "AA:BB:CC:DD:EE:02", acceleration: 2.1 }
];

print("Ruuvi seed started");

readings.forEach((reading, index) => {
  database.ruuvi_sensor_data.insertOne({
    mac_address: reading.mac_address,
    time: new Date(),
    data: { acceleration: reading.acceleration },
    sequence: index + 1,
    source: "playground-seed"
  });
  print(`Inserted reading ${index + 1}/${readings.length}`);
  if (index < readings.length - 1) {
    sleep(1000);
  }
});

print("Ruuvi seed finished");
