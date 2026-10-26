---
slug: environment-readiness
id: ioqpmyf2xbje
type: challenge
title: Lab 00 - Create your Atlas environment
teaser: Provision a dedicated Atlas cluster and Stream Processing workspace.
notes:
- type: text
  contents: Use a dedicated non-production Atlas project. You create the Atlas resources
    from this sandbox with Atlas CLI.
tabs:
- id: sma7htfmuz8s
  title: Terminal
  type: terminal
  hostname: workstation
  workdir: /opt/asp-playground
difficulty: ""
enhanced_loading: null
---

# Lab 00: Create your Atlas environment

## Outcome

Create the Atlas resources used by Labs 01, 02, and 08. The workstation provides Atlas CLI and `mongosh`; you create the cluster, database user, ASP workspace, and connections with Atlas CLI.

## Before you begin

- Use an existing, dedicated, non-production Atlas project where you can create clusters, database users, and Stream Processing workspaces. This lab does not create the Atlas project itself.
- Use a project reserved for this track run. The labs use fixed database and connection names.
- Atlas CLI, `mongosh`, and `jq` are available in the sandbox.
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
export RUN_ID="${RUN_ID:-$(date -u +%Y%m%d%H%M%S)}"
export CLUSTER_NAME="${CLUSTER_NAME:-asp-lab-${RUN_ID}}"
export WORKSPACE="${WORKSPACE:-asp-lab-${RUN_ID}}"
```

Keep these values if you retry a step so you reuse the same resources. Do not
generate a new `RUN_ID` to recover from a failed command.

## 2. Create the Atlas cluster and database user

Create an M0 test cluster in a region supported by your project. Change the provider or region if needed.

Before creating it, check whether this run's cluster already exists:

```bash
atlas clusters describe "$CLUSTER_NAME" --projectId "$PROJECT_ID" --output json
```

If it exists, reuse it and confirm its state is `IDLE` and tier is `M0`. If it
is still creating, wait and run `describe` again; if it failed, resolve the
Atlas error before continuing. Create it only when Atlas reports that this
named cluster does not exist. If the command reports an authentication,
permission, or network error, stop and fix that error instead of retrying
`create`.

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

Before creating the user, check whether `aspLabUser` already exists:

```bash
atlas dbusers describe aspLabUser --projectId "$PROJECT_ID" --output json
```

If it exists, verify it has the `atlasAdmin` built-in role and reuse it. Create
it only when Atlas reports that the user does not exist. Do not treat other CLI
errors as proof that it is missing.

```bash
read -r -s -p "Database password: " DB_PASSWORD
printf '\n'
atlas dbusers create atlasAdmin \
  --projectId "$PROJECT_ID" \
  --username aspLabUser \
  --password "$DB_PASSWORD"
unset DB_PASSWORD
```

Allow the sandbox VM's public IP to connect to the test cluster. First list the
project access list and check whether this IP is already present; add it only if
missing:

```bash
SANDBOX_IP="$(curl -fsS https://checkip.amazonaws.com)"
printf 'Sandbox public IP: %s\n' "$SANDBOX_IP"
atlas accessLists list --projectId "$PROJECT_ID" --output json
```

If the list does not contain `$SANDBOX_IP/32`, add it:

```bash
atlas accessLists create "${SANDBOX_IP}/32" \
  --projectId "$PROJECT_ID" \
  --comment "Instruqt ASP foundations sandbox"
```

## 3. Create the Stream Processing workspace

Create an SP2 workspace in a supported region. This GCP region is an example;
use a region available to your project. Before creating it, check whether this
run's workspace already exists:

```bash
atlas api streams getStreamWorkspace \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" --output json
```

If it exists, reuse it. Create it only when Atlas returns a not-found response;
stop for authentication, permission, or network errors. Workspace names must
be unique within the project.

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

List the workspace connections first. The Sample connection is usually created
with the workspace; create it only when the list confirms it is missing. If the
list command fails, stop and resolve the API error rather than treating it as an
empty list:

```bash
CONNECTIONS_JSON="$(atlas api streams listStreamConnections \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" --output json)" || exit 1
if ! jq -e '(.connections // .results // .) | any(.[]?; .name == "sample_stream_solar")' \
  >/dev/null <<<"$CONNECTIONS_JSON"; then
  jq -n '{name:"sample_stream_solar",type:"Sample"}' > /tmp/sample-connection.json
  atlas api streams createStreamConnection \
    --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" \
    --file /tmp/sample-connection.json --output json
fi
```

Create the Atlas connection used by the processors only if it is not already
listed. This makes retries safe after a partial failure:

```bash
if ! atlas api streams listStreamConnections \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" --output json > /tmp/asp-connections.json; then
  echo "Could not list workspace connections; fix the Atlas API error before continuing." >&2
  exit 1
fi
CONNECTIONS_JSON="$(< /tmp/asp-connections.json)"
if ! jq -e '(.connections // .results // .) | any(.[]?; .name == "atlas_lab")' \
  >/dev/null <<<"$CONNECTIONS_JSON"; then
  jq -n --arg cluster "$CLUSTER_NAME" \
    '{name:"atlas_lab",type:"Cluster",clusterName:$cluster,dbRoleToExecute:{role:"atlasAdmin",type:"BUILT_IN"}}' \
    > /tmp/atlas-connection.json
  atlas api streams createStreamConnection \
    --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" \
    --file /tmp/atlas-connection.json --output json
else
  echo "atlas_lab already exists; reusing it."
fi
```

The workspace response has no readiness state to wait for. It is usable when
`hostnames[0]` is present. Each required connection must report `READY`;
`PENDING` means wait and check again, while `FAILED` means stop and resolve the
connection error.

```bash
atlas api streams getStreamWorkspace \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" --output json \
  | jq -e '.hostnames[0] != null and .hostnames[0] != ""'
atlas api streams listStreamConnections \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" --output json \
  | jq -r '(.connections // .results // .)[] | [.name, .state] | @tsv'
```

Continue only when `sample_stream_solar` and `atlas_lab` both show `READY`.

## 4. Prepare the Lab 01 sink

Get the cluster URI base and ASP hostname. These values contain hostnames, not
database credentials:

```bash
ATLAS_BASE_URI="$(atlas clusters describe "$CLUSTER_NAME" --projectId "$PROJECT_ID" --output json \
  | jq -r '.connectionStrings.standardSrv')"
CLUSTER_HOST="${ATLAS_BASE_URI#mongodb+srv://}"
CLUSTER_HOST="${CLUSTER_HOST%%/*}"
ASP_HOST="$(atlas api streams getStreamWorkspace \
  --groupId "$PROJECT_ID" --tenantName "$WORKSPACE" --output json \
  | jq -r '.hostnames[0]')"
printf 'Cluster host: %s\nASP host: %s\n' "$CLUSTER_HOST" "$ASP_HOST"
```

Use database user `aspLabUser` and its password to form both URIs. Replace the
placeholders below; percent-encode reserved characters in the username or
password, or use a password made only of URI-safe characters:

```text
ATLAS_URI=mongodb+srv://aspLabUser:<encoded-password>@<cluster-host>/playground?retryWrites=true&w=majority&authSource=admin
ASP_URI=mongodb://aspLabUser:<encoded-password>@<asp-host>/?authSource=admin&tls=true
```

Type each complete URI only when the helper prompts for it. The prompts do not
echo input. Do not place real URIs in shell commands, shell history, screenshots,
or shared output.

Run the secret helper and enter both URIs when prompted:

```bash
bash ./instruqt/tracks/asp-foundations/bin/save-atlas-secrets
```

The helper stores those values in a permission-restricted file for this sandbox.

Create the Lab 01 time-series sink:

```bash
./instruqt/tracks/asp-foundations/bin/atlas-shell
```

In `mongosh`:

```javascript
use playground
{
  const sink = db.getCollectionInfos({ name: "fast_start_events" })[0]
  if (!sink) {
    db.createCollection("fast_start_events", { timeseries: { timeField: "timestamp" } })
  } else if (!sink.options.timeseries || sink.options.timeseries.timeField !== "timestamp") {
    throw new Error("fast_start_events exists but is not the expected time-series collection")
  } else {
    print("fast_start_events already exists; reusing it")
  }
}
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

Confirm `sample_stream_solar` and `atlas_lab` are present.

Press **Check** when the Atlas connection and required ASP connections are ready.

## Safety

Use only the dedicated project and resources created for this run. Do not paste passwords or connection URIs into shared output. Atlas resources are not deleted automatically when the Instruqt sandbox ends; follow the cleanup commands in the Lab 00 source manual and delete only resources you created for this run.
