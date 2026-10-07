# Lab 00: Atlas infrastructure provisioning

**Source:** [`projects/00-assessment`](../../../../projects/00-assessment/)

## Learner outcome

Create the test cluster, database user, ASP workspace, and required connections with Atlas CLI from the Docker-enabled Instruqt VM. Labs 01, 02, 04, and 08 consume these resources.

## Instruqt adaptation

- Ask the learner to provide a dedicated, non-production Atlas `PROJECT_ID`; Lab 00 does not create the Atlas project itself.
- Install Atlas CLI in the sandbox VM and show the tested provisioning commands from `projects/00-assessment/MANUAL.md`, using learner-supplied project details.
- Do not copy local `.env` values, project identifiers, or connection URIs into the assignment.
- Store resulting connection URIs in a permission-restricted per-sandbox file, not shared Instruqt team secrets.
- Bootstrap Kafka only after the learner provides the current Atlas egress CIDRs for the workspace region.

## Success evidence

The learner-created cluster and workspace are ready, the `sample_stream_solar` and `atlas_lab` connections are available, Atlas connectivity succeeds, and no secret value is printed.

## Cleanup

Delete only the cluster, workspace, connections, and data created for this learner's run. Never remove pre-existing or shared resources.
