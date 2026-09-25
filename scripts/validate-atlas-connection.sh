#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PROJECT_ID:-}" || -z "${CLUSTER_NAME:-}" || -z "${ATLAS_URI:-}" ]]; then
  printf '%s\n' "Set PROJECT_ID, CLUSTER_NAME, and ATLAS_URI before running this preflight." >&2
  exit 1
fi

standard_srv="$(atlas clusters describe "$CLUSTER_NAME" \
  --projectId "$PROJECT_ID" \
  --output json | jq -r '.connectionStrings.standardSrv // empty')"

if [[ -z "$standard_srv" ]]; then
  printf '%s\n' "Cluster $CLUSTER_NAME has no connection string yet. Check its state in Atlas." >&2
  exit 1
fi

if ! mongosh "$ATLAS_URI" --quiet --eval 'quit(db.runCommand({ ping: 1 }).ok === 1 ? 0 : 1)' >/dev/null 2>&1; then
  printf '%s\n' "ATLAS_URI cannot connect to the current cluster." >&2
  printf 'Current Atlas endpoint: %s\n' "$standard_srv" >&2
  printf '%s\n' "Update the local ATLAS_URI hostname, then rerun this preflight." >&2
  exit 1
fi

printf 'Atlas connection: OK (%s)\n' "$CLUSTER_NAME"
