# Atlas Workstation Host Image

The track expects the Instruqt Host image `mongodb-ts-dev/asp-foundations-cli-v1`, configured in `tracks/asp-foundations/config.yml`. Build it once per reviewed toolchain change; sandbox startup then avoids package installation.

## Build the image

1. In Instruqt, open team `mongodb-ts-dev` > **Settings > Host images > Create image**.
2. Name the image `asp-foundations-cli-v1` and use `instruqt-ubuntu-22-04-base` as the base. This base includes the Instruqt agent/guest setup.
3. In the disposable image builder terminal, fetch the preparation script from a reviewed commit of this public repository and run it as root:

```bash
curl --fail --silent --show-error --location \
	https://raw.githubusercontent.com/unai-ss/atlas-stream-processor-playground/main/instruqt/image/prepare-host \
	--output /tmp/prepare-host
bash /tmp/prepare-host
```

The script installs Atlas CLI, `mongosh`, `jq`, `curl`, and `tar` on Ubuntu 22.04 or 24.04. It does not authenticate to Atlas, download project source, or start services. Verify tool versions, then save the image as `mongodb-ts-dev/asp-foundations-cli-v1`.

4. Do not save Atlas profiles, learner data, credentials, or temporary build files in the image. Follow [Instruqt's image preparation requirements](https://docs.instruqt.com/sandboxes/hosts/create-a-custom-vm-image.md).

At track startup, `setup-workstation` checks the preinstalled tools and downloads only the runtime files required by Labs 01, 02, and 08 from a public GitHub archive pinned by full commit SHA. No GitHub token is needed. The sandbox needs outbound HTTPS access to GitHub codeload and Atlas. It does not use Docker, Kafka, inbound ports, or sandbox TLS certificates.

When publishing runtime changes, update `source_revision` in `track_scripts/setup-workstation` to a reviewed public commit SHA and rerun the tests.

## Validate and publish

From `instruqt/tracks/asp-foundations/`:

```bash
instruqt track validate
instruqt track test asp-foundations
instruqt track push
```

Do not use `--force` unless overwriting remote changes is intentional. The automated track test simulates Lab 00 and does not create Atlas resources. Test the full learner flow with **Play track** and a dedicated non-production Atlas project; then delete only resources created for that run.