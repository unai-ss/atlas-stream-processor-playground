---
slug: late-data-join
type: challenge
title: Lab 04 - Kafka late-data join
teaser: Join temperature and humidity streams and inspect late-event repair.
notes:
  - type: text
    contents: Kafka runs in the Docker-enabled Instruqt VM. Atlas must be able to reach its public DNS endpoint on TCP 9094.
tabs:
  - title: Terminal
    type: terminal
    hostname: kafka
    workdir: /opt/asp-playground
---

# Lab 04: Kafka late-data join

## Outcome

Read temperature and humidity topics from the sandbox Kafka broker, join events in 30-second windows, and inspect late-event handling and repair.

## 1. Register the broker in ASP

The track starts a Docker Kafka broker on the `kafka` VM and provisions a TLS certificate for its Instruqt hostname. Inspect the endpoint without printing credentials:

```bash
./instruqt/tracks/asp-foundations/bin/show-kafka-endpoint
```

In the Connection Registry of this participant's ASP workspace, add a Kafka connection named `kafka_lab`:

- Bootstrap server: the endpoint printed above, port `9094`.
- Network access: Public IP.
- Security protocol: `SASL_SSL`.
- Mechanism: `PLAIN`.
- Username: `asp`.
- Password: retrieve the unique sandbox password with `./instruqt/tracks/asp-foundations/bin/show-kafka-endpoint`.
- Topics: `temperature` and `humidity`.

The Instruqt host firewall allows port 9094 only from the `ATLAS_KAFKA_ALLOWED_CIDRS` configured for the ASP workspace region. The track administrator must keep this list current. Test the connection in Atlas before continuing. Do not use the sandbox's private container hostname as the bootstrap address.

## 2. Create the Atlas collections

Open the test-cluster shell:

```bash
./instruqt/tracks/asp-foundations/bin/atlas-shell
```

Create the collections if they are not present:

```javascript
use playground
db.createCollection("sensor_weather")
db.createCollection("sensor_dlq")
```

## 3. Start the processors

In the ASP shell:

```bash
./instruqt/tracks/asp-foundations/bin/asp-shell
```

```javascript
load("/workspace/projects/04-late-data-join/processor.js")
sp.sensorJoins.start()
sp.sensorDLQUpdater.start()
sp.sensorJoins.stats()
```

## 4. Produce test events

Produce a controlled set of compatible JSON records to both topics:

```bash
./instruqt/tracks/asp-foundations/bin/publish-weather-fixture
```

The helper emits on-time readings, advances event time beyond the window, then emits an older temperature reading. Each event contains a shared `sensorIdGroup`, an ISO timestamp, and the topic-specific value. It uses the broker's local authenticated connection and does not print the password.

Observe `sensor_weather`, the processor statistics, and `sensor_dlq`. Confirm the late record is captured and that `sensorDLQUpdater` repairs the materialized view.

## Verification and cleanup

Run `./instruqt/tracks/asp-foundations/bin/check-lab04` after confirming the connection and processor state. Stop and drop only `sensorJoins` and `sensorDLQUpdater`; clean only this participant's exercise collections.

This exercise requires a public endpoint reachable from Atlas. If the Atlas connection test fails, do not continue by substituting a private sandbox hostname; resolve endpoint reachability and broker access first.
