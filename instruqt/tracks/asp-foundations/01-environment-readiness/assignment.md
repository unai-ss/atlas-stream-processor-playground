---
slug: environment-readiness
type: challenge
title: Lab 00 - Create your Atlas environment
teaser: Provision a dedicated Atlas cluster and Stream Processing workspace.
notes:
  - type: text
    contents: Use a dedicated non-production Atlas project. You create the Atlas resources from this sandbox with Atlas CLI.
tabs:
  - title: Terminal
    type: terminal
    hostname: kafka
    workdir: /opt/asp-playground
---

# Lab 00: Create your Atlas environment

## Outcome

Create the Atlas resources used by Labs 01, 02, 04, and 08. The Docker VM prepares the command-line tools; you create the cluster, database user, ASP workspace, and connections with Atlas CLI.

## Before you begin

- Use an existing, dedicated, non-production Atlas project where you can create clusters, database users, and Stream Processing workspaces. This lab does not create the Atlas project itself.
- Use a project reserved for this track run. The labs use fixed database and connection names.
- Atlas CLI, `jq`, and Docker are available in the sandbox.
- Resource creation may take several minutes and Atlas resources may incur charges.

## 1. Authenticate and select your project

Authenticate with your Atlas account. Open the verification URL from the CLI in your browser and complete the sign-in.

```bash
atlas auth login --noBrowser
atlas auth whoami
atlas projects list
```

Set `PROJECT_ID` to the ID of your dedicated Atlas project. Use unique cluster and workspace names for this run:

```bash
export PROJECT_ID="<your-dedicated-project-id>"
export RUN_ID="$(date -u +%Y%m%d%H%M%S)"
export CLUSTER_NAME="asp-lab-${RUN_ID}"
export WORKSPACE="asp-lab-${RUN_ID}"
```

## 2. Create the Atlas cluster and database user

Create an M0 test cluster in a region supported by your project. Change the provider or region if needed.

```bash
atlas clusters create "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --provider AWS \
  --region EU_WEST_1 \
  --tier M0 \
  --tag env=asp-foundations \
  --watch
```

Create a database user for the lab. Enter a new password without echoing it; do not reuse your Atlas account password.

```bash
read -r -s -p "Database password: " DB_PASSWORD
printf '\n'
atlas dbusers create atlasAdmin \
  --projectId "$PROJECT_ID" \
  --username aspLabUser \
  --password "$DB_PASSWORD"
unset DB_PASSWORD
```

Allow the sandbox VM's public IP to connect to the test cluster:

```bash
atlas accessLists create "$(curl -fsS https://checkip.amazonaws.com)/32" \
  --projectId "$PROJECT_ID" \
  --comment "Instruqt ASP foundations sandbox"
```

## 3. Create the Stream Processing workspace

Create an SP2 workspace in a supported region. This GCP region is an example; use a region available to your project.

```bash
jq -n \
  --arg name "$WORKSPACE" \
  '{name:$name,dataProcessRegion:{cloudProvider:"GCP",region:"US_WEST1"},streamConfig:{tier:"SP2",maxTierSize:"SP2"}}' \
  > /tmp/asp-workspace.json

atlas api streams createStreamWorkspace \
  --groupId "$PROJECT_ID" \
  --file /tmp/asp-workspace.json \
  --output json
```

List the workspace connections first. The Sample connection is usually created with the workspace; the command below creates it only when missing:

```bash
if ! atlas api streams listStreamConnections \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" --output json \
  | jq -e '(.connections // .results // .) | any(.[]?; .name == "sample_stream_solar")' >/dev/null; then
  jq -n '{name:"sample_stream_solar",type:"Sample"}' > /tmp/sample-connection.json
  atlas api streams createStreamConnection \
    --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" \
    --file /tmp/sample-connection.json --output json
fi
```

Create the Atlas connection used by the processors:

```bash
jq -n --arg cluster "$CLUSTER_NAME" \
  '{name:"atlas_lab",type:"Cluster",clusterName:$cluster,dbRoleToExecute:{role:"atlasAdmin",type:"BUILT_IN"}}' \
  > /tmp/atlas-connection.json
atlas api streams createStreamConnection \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" \
  --file /tmp/atlas-connection.json --output json
```

Wait for the workspace and both connections to become ready:

```bash
atlas api streams getStreamWorkspace \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" --output json
atlas api streams listStreamConnections \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" --output json
```

## 4. Prepare the Lab 01 sink

Get the cluster connection string and ASP hostname without saving them in shell history:

```bash
atlas clusters describe "$CLUSTER_NAME" --projectId "$PROJECT_ID" --output json \
  | jq -r '.connectionStrings.standardSrv'
atlas api streams getStreamWorkspace \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" --output json \
  | jq -r '.hostnames[0]'
```

Use the Atlas UI to complete the cluster URI with your database user. Build the ASP URI from the returned workspace hostname and the same database credentials. Do not print either URI.

Run the secret helper and enter both URIs plus the current Atlas egress CIDRs for this workspace region when prompted:

```bash
bash ./instruqt/tracks/asp-foundations/bin/save-atlas-secrets
```

The helper stores those values in a permission-restricted file for this sandbox and starts the Docker Kafka broker. If the Atlas egress CIDRs are not known yet, stop here and obtain them before opening Kafka ingress.

Create the Lab 01 time-series sink:

```bash
./instruqt/tracks/asp-foundations/bin/atlas-shell
```

In `mongosh`:

```javascript
use playground
db.createCollection("fast_start_events", { timeseries: { timeField: "timestamp" } })
```

## 5. Verify readiness

Check Atlas access and list the workspace connections:

```bash
./instruqt/tracks/asp-foundations/bin/check-atlas-access
./instruqt/tracks/asp-foundations/bin/asp-shell
```

In the ASP shell:

```javascript
sp.listConnections()
```

Confirm `sample_stream_solar` and `atlas_lab` are present. Lab 04 creates and validates the Kafka connection after you inspect the broker endpoint.

Press **Check** when the Atlas connection and required ASP connections are ready.

## Safety

Use only the dedicated project and resources created for this run. Do not paste passwords or connection URIs into shared output. Atlas resources are not deleted automatically when the Instruqt sandbox ends; follow the cleanup commands in the Lab 00 source manual and delete only resources you created for this run.
