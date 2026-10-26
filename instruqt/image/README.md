# Atlas Workstation Image

Build target: `mongodb-ts-dev/asp-foundations-cli-v1`. This image name is configured in the track but must be created and saved before publishing.

The workstation image supplies Atlas CLI, `mongosh`, `jq`, `curl`, and `tar`. At track startup, `setup-workstation` downloads only the required processor, helper, and seed files from a pinned commit in the public source repository. The image does not install Docker, run Kafka, expose inbound ports, or contain Atlas credentials.

## Build the runtime bundle

From the repository root:

```bash
node --test instruqt/image/test-runtime.mjs
bash instruqt/image/package-runtime /absolute/path/outside/the/repo/asp-runtime-v1.tar.gz
tar -tzf /absolute/path/outside/the/repo/asp-runtime-v1.tar.gz
```

The archive contains only the workstation preparation script. Runtime files are fetched by the track setup script from the pinned source revision, not baked into the image.

## Build in Instruqt

1. Open team `mongodb-ts-dev` > **Settings > Host images > Create image**.
2. Name the image `asp-foundations-cli-v1`. Use a supported Ubuntu 22.04 or 24.04 base with the Google guest environment and Instruqt agent requirements. Do not select a Docker-enabled base image.
3. Transfer the bundle into the disposable image builder using the team's approved private transfer mechanism. Do not place credentials in the builder or publish the bundle publicly.
4. Extract the archive and run the preparation script as root, only on the fresh image builder:

```bash
mkdir -p /tmp/asp-image-build
tar -xzf /path/to/asp-runtime-v1.tar.gz -C /tmp/asp-image-build
bash /tmp/asp-image-build/image/prepare-host
atlas --version
mongosh --version
jq --version
curl --version
tar --version
```

The script installs the command-line tools only. It does not authenticate to Atlas or download project source during image creation.

5. Remove the temporary bundle/build directory and transfer credentials. Confirm there are no Atlas profiles, sandbox secret files, or learner data in the image. Follow [Instruqt's image preparation requirements](https://docs.instruqt.com/sandboxes/hosts/create-a-custom-vm-image.md), including resetting machine identity when required. Never save a used learner sandbox as the base image.
6. Save the image as `mongodb-ts-dev/asp-foundations-cli-v1` and verify its exact reference matches `tracks/asp-foundations/config.yml`.

No public hostname, TLS certificate, or external ingress is required. The workstation initiates outbound HTTPS connections to GitHub to retrieve the pinned runtime source and to Atlas for learner operations. No GitHub token is needed because the source repository is public.

When publishing runtime changes, update `source_revision` in `track_scripts/setup-workstation` to the reviewed public commit SHA and rerun the runtime tests.

## Publish and test

From `instruqt/tracks/asp-foundations/`:

```bash
instruqt track validate
instruqt track push
time instruqt track test
```

Do not use `--force`. The automated track test simulates Lab 00 and does not create Atlas resources. Test the full learner flow in a dedicated non-production Atlas project, then clean up only resources created for that run. Measure cold VM startup and Atlas provisioning separately before setting the track time limit or enabling hot starts.