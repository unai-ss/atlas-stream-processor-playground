# Lab 04: Kafka late-data join

**Source:** [`projects/04-late-data-join`](../../../../projects/04-late-data-join/)

## Learner outcome

Read temperature and humidity topics from the Docker-backed Kafka broker in the participant's Instruqt VM, join records in ASP, inspect late-event DLQ entries, and verify repair into the Atlas materialized view.

## Instruqt and Atlas requirements

- Run the broker in a Docker-enabled Instruqt VM, not a container host, because Atlas requires inbound reachability to the broker.
- Enable `high-ports` ingress and provision the VM's Instruqt TLS certificate.
- Advertise the VM's participant-specific public DNS name on TCP 9094; do not advertise the sandbox's internal container hostname.
- Use `SASL_SSL` with `PLAIN` authentication and a random password unique to that sandbox.
- Restrict inbound TCP 9094 to the region-appropriate Atlas egress CIDRs using `ATLAS_KAFKA_ALLOWED_CIDRS`.
- Register `kafka_lab` in the participant's ASP workspace and test the connection before starting the processor.
- Do not share one ASP workspace/Connection Registry across concurrent sandboxes with distinct broker endpoints.

## Success evidence

The ASP connection test succeeds; both processors run; an on-time reading appears in `sensor_weather`; a late reading appears in `sensor_dlq`; and the DLQ updater repairs its value into the materialized view.

## Cleanup

Remove only this participant's processors and Atlas collections. Instruqt removes the sandbox VM and its Docker broker at the end of the track.