# MongoDB Container Workstation

The track uses the existing 1024 MB container image in `config.yml`:

```text
europe-west1-docker.pkg.dev/instruqt-mongodb/instruqt-images/mongodb:1.0.22
```

The image description includes MongoDB, `mongosh`, Python, default tools, and sample data. The startup hook additionally requires `atlas`, `jq`, `curl`, and `tar`; the image description does not confirm that `atlas` is included, so `instruqt track test` must verify it. If a required tool is missing, add it to the container image rather than installing packages during every sandbox start.

## Artifact Registry access

If the Artifact Registry repository is private, grant Instruqt's service accounts `roles/storage.objectViewer` and `roles/artifactregistry.reader` on the backing storage/repository:

- `instruqt-participants-nodepool@instruqt-prod.iam.gserviceaccount.com`
- `instruqt-backend@instruqt-prod.iam.gserviceaccount.com`

The image must be built for Linux `amd64`. Instruqt's container host runs the image directly; this track does not use Docker-in-Docker, Kafka, inbound ports, or sandbox TLS certificates.

At startup, `setup-workstation` downloads only the runtime files required by Labs 01, 02, and 08 from a public GitHub archive pinned by full commit SHA. No GitHub token is needed. The sandbox needs outbound HTTPS access to GitHub codeload and Atlas.

When publishing runtime changes, update `source_revision` in `track_scripts/setup-workstation` to a reviewed public commit SHA and rerun the tests.

## Validate and publish

From `instruqt/tracks/asp-foundations/`:

```bash
instruqt track validate
instruqt track test asp-foundations
instruqt track push
```

Do not use `--force` unless overwriting remote changes is intentional. The automated track test simulates Lab 00 and does not create Atlas resources. Test the full learner flow with **Play track** and a dedicated non-production Atlas project; then delete only resources created for that run.