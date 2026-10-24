# IP traffic HTTP enrichment

Reference author: Kenny Gorman.

Source: https://medium.com/towards-data-engineering/enriching-via-api-the-https-operator-in-mongodb-atlas-stream-processing-bbe03ad70ac8

**Overview:** Enrich traffic events with data from an external HTTP API and
store the geographic information returned for each IP address in Atlas.

## Prerequisites

Before using `ATLAS_URI`, run `./scripts/validate-atlas-connection.sh` from the
project root to detect an outdated hostname.

Before continuing, run `atlas auth login` in the terminal and verify the
session with `atlas auth whoami`. If the session has expired, run
`atlas auth login` again.

Register an HTTPS connection named `ipinfo` with the base URL
`https://ipinfo.io/`. If you use a token, configure it as a secret in the
Connection Registry. This lab uses documentation IP addresses and generates
events with `$source.documents`.

To query the output in the Atlas cluster, connect with:

```bash
mongosh "$ATLAS_URI"
```

## Run the Lab

```javascript
load("projects/05-http-enrichment/processor.js")
sp.labHttpEnrichment.start()
sp.labHttpEnrichment.stats()
```

The result is written to `playground.ip_traffic_enriched` and includes the
city, region, and country returned by the API.

The HTTP request may incur costs or be subject to the external service's rate
limits if you change the example source. This lab is a local adaptation of the
referenced article.
