# Instruqt workspace

This directory contains the Instruqt adaptation of the Atlas Stream Processing playground. The processor and seed-script snapshots required at runtime are included here so the Instruqt sandbox does not depend on the parent repository.

## GitHub repository

The Instruqt source is mirrored to [10gen/TSEDU-4420-ASP-Playground-Instruqt](https://github.com/10gen/TSEDU-4420-ASP-Playground-Instruqt) as a Git subtree. The parent playground repository remains separate and is not cloned by the sandbox. Runtime source files are versioned inside this subtree.

Configure the destination remote once in the parent repository:

```bash
git remote add instruqt-source https://github.com/10gen/TSEDU-4420-ASP-Playground-Instruqt.git
```

After committing changes in `instruqt/`, publish only this directory to its repository:

```bash
git subtree push --prefix=instruqt instruqt-source main
```

When working from a clone of the Instruqt repository, run track commands from `tracks/asp-foundations/`.

## Track in preparation

`tracks/asp-foundations/` contains a draft learner track for Labs 00, 01, 02, and 08. Its workstation image provides Atlas CLI, `mongosh`, and `jq`; the track does not use Docker, Kafka, external ingress, or sandbox TLS certificates.

## Implementation boundary

The content here is a draft and must be validated in the team's Instruqt organization before publishing. In particular:

- Confirm the Instruqt CLI and track schema version used by the team.
- The track uses the existing `mongodb-ts-dev/instruqt-mongodb-1024` Host image. Its setup script verifies the required CLI tools and downloads runtime files from a pinned public GitHub commit. No GitHub token is required. See [the image guide](image/README.md) if a tool is missing.
- Have each learner provision Atlas resources from the sandbox with Atlas CLI; do not deliver shared Atlas credentials through Instruqt team secrets.
- The Host image contains Atlas CLI, `mongosh`, and `jq`; VM setup checks these tools and downloads runtime files from a pinned public GitHub commit. Update the pinned commit when runtime source changes.
- Validate setup, challenge, and cleanup scripts with a full sandbox run.

Do not copy `.env`, Atlas URIs, credentials, readiness evidence, or production data into this directory. Keep learner-facing instructions concise and make each exercise independently verifiable and safe to clean up.

## Recommended improvement workflow

1. Keep each improvement focused and edit the source in this repository.
2. Run `instruqt track validate`, `git diff --check`, and `bash -n` for changed shell scripts.
3. Commit and publish the Instruqt subtree. Update the pinned runtime commit in `track_scripts/setup-workstation` when runtime files change.
4. From `tracks/asp-foundations/`, run `instruqt track push` without `--force`. Use `--force` only after confirming the remote differences belong to this track update.
5. Run `instruqt track test` to check sandbox startup and lifecycle scripts. This starts a temporary Instruqt sandbox; its Lab 00 test path is simulated and does not create Atlas resources.
6. Use **Play track** for a learner-flow test. The participant supplies a dedicated Atlas `PROJECT_ID` and creates the Atlas resources in Lab 00.
7. Review any IDs or metadata written back by Instruqt, then commit and push those changes to keep GitHub as the source of the track.
