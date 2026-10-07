# Lab 01: Sample to Atlas

**Source:** [`projects/01-fast-start`](../../../../projects/01-fast-start/)

## Learner outcome

Inspect events from `sample_stream_solar`, create and start a persistent processor, normalize the timestamp, and verify documents arrive in the Atlas sink.

## Instruqt adaptation

- Use the existing `processor.js` as the implementation reference; replace machine-specific absolute paths in learner instructions with track-relative paths or preloaded files.
- Separate source inspection from persistent processor creation.
- Provide a verification step that checks for at least one sink document with a date-type `timestamp`.
- Treat processor creation, start, and sink delivery as separate checks.

## Success evidence

The processor runs without unexpected errors and the dedicated sink contains a valid output document.

## Cleanup

Stop and drop only the processor and sink resources allocated to the learner run. Do not delete the shared workspace or cluster.
