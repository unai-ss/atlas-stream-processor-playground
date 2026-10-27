# Ubuntu Workstation Setup

The track uses Instruqt's stock `ubuntu-22-04` VM preset in `config.yml`; no custom Host image is required.

At sandbox startup, `setup-workstation` installs Atlas CLI, `mongosh`, `jq`, `curl`, and `tar`, then downloads only the runtime files required by Labs 01, 02, and 08 from the public GitHub repository. The source revision is pinned by full commit SHA in the setup script. No GitHub token is needed.

The sandbox needs outbound HTTPS access to the MongoDB package repository, GitHub codeload, and Atlas. It does not use Docker, Kafka, inbound ports, or sandbox TLS certificates.

When publishing runtime changes, update `source_revision` in `track_scripts/setup-workstation` to a reviewed public commit SHA and rerun the tests.

## Validate and publish

From `instruqt/tracks/asp-foundations/`:

```bash
instruqt track validate
instruqt track test asp-foundations
instruqt track push
```

Do not use `--force` unless overwriting remote changes is intentional. The automated track test simulates Lab 00 and does not create Atlas resources. Test the full learner flow with **Play track** and a dedicated non-production Atlas project; then delete only resources created for that run.