# Sensor join with late data repair

Reference author: Joseph Niemiec.

Source: https://medium.com/mongodb/joins-with-late-data-handling-in-atlas-stream-processing-28219d365714

**Overview:** Join temperature and humidity streams from Kafka using windows
and controlled lateness, then repair late results through a DLQ collection.

## Prerequisites

Before using `ATLAS_URI`, run `./scripts/validate-atlas-connection.sh` from the
project root to detect an outdated hostname.

Before continuing, run `atlas auth login` in the terminal and verify the
session with `atlas auth whoami`. If the session has expired, run
`atlas auth login` again.

Register a Kafka connection named `kafka_lab` with the `temperature` and
`humidity` topics. Register `atlas_lab` and create the
`playground.sensor_weather` and `playground.sensor_dlq` collections.

To query these collections in the Atlas cluster, use:

```bash
mongosh "$ATLAS_URI"
```

## Run the Lab

```javascript
load('[local-repository]/projects/04-late-data-join/processor.js')
sp.sensorJoins.start()
sp.sensorDLQUpdater.start()
sp.sensorJoins.stats()
```

The first processor joins temperature and humidity in 30-second windows,
allows five seconds of lateness, and sends late events to the DLQ. The second
processor repairs the materialized view using the DLQ.

This lab follows the pattern in the referenced article and requires Kafka to
test real lateness behavior.
