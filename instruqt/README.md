# Instruqt workspace

This directory contains the Instruqt adaptation of the Atlas Stream Processing playground. It is kept separate from `projects/`, whose READMEs and processors remain the source material for the existing labs.

## GitHub repository

The Instruqt source is mirrored to [10gen/TSEDU-4420-ASP-Playground-Instruqt](https://github.com/10gen/TSEDU-4420-ASP-Playground-Instruqt) as a Git subtree. The parent playground repository remains unchanged as a separate repository; sandbox setup still clones it for processor source files.

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

`tracks/asp-foundations/` contains a draft learner track for Labs 00, 01, 02, 04, and 08. Its Docker-enabled VM hosts the Kafka broker for Lab 04; the other labs use Atlas Stream Processing connections directly.

## Implementation boundary

The content here is a draft and must be validated in the team's Instruqt organization before publishing. In particular:

- Confirm the Instruqt CLI and track schema version used by the team.
- Have each learner provision Atlas resources from the sandbox with Atlas CLI; do not deliver shared Atlas credentials through Instruqt team secrets.
- Confirm the Docker VM's public hostname, TLS certificate, and TCP 9094 reachability from Atlas.
- The VM setup clones GitHub `main` by default. Push repository changes to `main` before testing them in a sandbox; testing another ref requires passing that ref to the setup script.
- Validate setup, challenge, and cleanup scripts with a full sandbox run.

Do not copy `.env`, Atlas URIs, credentials, readiness evidence, or production data into this directory. Keep learner-facing instructions concise and make each exercise independently verifiable and safe to clean up.

## Recommended improvement workflow

1. Keep each improvement focused and edit the source in this repository.
2. Run `instruqt track validate`, `git diff --check`, and `bash -n` for changed shell scripts.
3. Commit and push repository changes to the ref the sandbox setup will clone. It uses `main` by default.
4. From `tracks/asp-foundations/`, run `instruqt track push` without `--force`. Use `--force` only after confirming the remote differences belong to this track update.
5. Run `instruqt track test` to check sandbox startup and lifecycle scripts. This starts a temporary Instruqt sandbox; its Lab 00 test path is simulated and does not create Atlas resources.
6. Use **Play track** for a learner-flow test. The participant supplies a dedicated Atlas `PROJECT_ID` and creates the Atlas resources in Lab 00.
7. Review any IDs or metadata written back by Instruqt, then commit and push those changes to keep GitHub as the source of the track.
