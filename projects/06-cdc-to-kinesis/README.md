# MongoDB CDC to Kinesis

Reference author: Igor Alekseev; published by MongoDB.

Source: https://medium.com/mongodb/streaming-mongodb-change-events-to-amazon-redshift-via-atlas-stream-processing-and-kinesis-9922cb2ef611

**Overview:** Convert changes from an Atlas collection into compact events and
publish them to Kinesis using `device_id` as the partition key.

## Prerequisites

Before using `ATLAS_URI`, run `./scripts/validate-atlas-connection.sh` from the
project root to detect an outdated hostname.

Before continuing, run `atlas auth login` in the terminal and verify the
session with `atlas auth whoami`. If the session has expired, run
`atlas auth login` again.

1. Create an `atlas_lab` connection pointing to the test cluster.
2. Create a Kinesis stream and an Atlas connection named `kinesis_lab`, with the region, stream, and IAM role configured.
3. Insert documents into `playground.device_events` with `device_id`, `timestamp`, and `obs.watts` / `obs.temp`.

To insert documents into the Atlas cluster, open `mongosh` using the URI that
already contains the credentials for `stream[redacted]`:

```bash
mongosh "$ATLAS_URI"
```

This lab creates only the Atlas processor. Configure IAM, Kinesis, and Redshift
outside this repository, and never store credentials in files.

## Run the Lab

```javascript
load('[local-repository]/projects/06-cdc-to-kinesis/processor.js')
sp.labCdcKinesis.start()
sp.labCdcKinesis.stats()
```

Insert, update, and replace changes are flattened and sent to Kinesis with
`device_id` as the partition key.

This lab is a local adaptation of the referenced article and requires live AWS
resources to observe the destination.
