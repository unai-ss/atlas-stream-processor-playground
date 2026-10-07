---
slug: environment-readiness
type: challenge
title: Lab 00 - Environment readiness
teaser: Confirm your isolated Atlas Stream Processing environment is ready.
notes:
  - type: text
    contents: Connect to the participant's test workspace. Never paste credentials into the assignment or terminal output.
tabs:
  - title: Terminal
    type: terminal
    hostname: kafka
    workdir: /opt/asp-playground
---

# Lab 00: Environment readiness

## Outcome

Verify that your test Atlas cluster and participant-isolated Atlas Stream Processing (ASP) workspace are reachable before creating processors.

## Prerequisites

The track administrator must provision these Instruqt secrets for this participant:

- `ASP_URI`: the participant's `mongosh` connection URI for the ASP workspace.
- `ATLAS_URI`: the participant's test-cluster URI, with access to the `playground` database.

The URIs must not be printed, committed, or shared. The track generates a separate random password for the Kafka broker in this sandbox; retrieve it only when completing Lab 04. Confirm that `ASP_URI` points to a workspace whose Connection Registry is dedicated to this participant. Shared workspaces cannot safely hold a different ephemeral Kafka endpoint for every concurrent sandbox.

## Verify access

From the Terminal tab:

```bash
cd /opt/asp-playground
./instruqt/tracks/asp-foundations/bin/asp-shell
```

In the ASP shell, list the workspace connections:

```javascript
sp.listConnections()
```

Confirm `sample_stream_solar` and `atlas_lab` are present. Exit the shell, then verify test-cluster access without displaying the URI:

```bash
./instruqt/tracks/asp-foundations/bin/check-atlas-access
```

Press **Check** when both checks succeed.

## Safety

This readiness check is non-destructive. It does not create or delete Atlas resources.
