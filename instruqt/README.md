# Instruqt workspace

This directory contains the Instruqt adaptation of the Atlas Stream Processing playground. It is kept separate from `projects/`, whose READMEs and processors remain the source material for the existing labs.

## Track in preparation

`tracks/asp-foundations/` contains a draft learner track for Labs 00, 01, 02, 04, and 08. Its Docker-enabled VM hosts the Kafka broker for Lab 04; the other labs use Atlas Stream Processing connections directly.

## Implementation boundary

The content here is a draft and must be validated in the team's Instruqt organization before publishing. In particular:

- Confirm the Instruqt CLI and track schema version used by the team.
- Configure per-participant Atlas/ASP access and deliver credentials through Instruqt secrets.
- Confirm the Docker VM's public hostname, TLS certificate, and TCP 9094 reachability from Atlas.
- Pin the sandbox's `ASP_PLAYGROUND_REF` to a commit containing the track files.
- Validate setup, challenge, and cleanup scripts with a full sandbox run.

Do not copy `.env`, Atlas URIs, credentials, readiness evidence, or production data into this directory. Keep learner-facing instructions concise and make each exercise independently verifiable and safe to clean up.
