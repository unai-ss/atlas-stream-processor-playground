# Lab 08: ETL parallelism

**Source:** [`projects/08-parallelism`](../../../../projects/08-parallelism/)

## Learner outcome

Compare serial and parallel sink processing while distinguishing functional correctness from throughput and ordering guarantees.

## Instruqt adaptation

- Use the reproducible Change Stream mode as the primary exercise; Sample mode is unsuitable for deterministic volume comparisons.
- Start both processors before inserting the same controlled batch.
- Use a unique run identifier and compare output records, counts, and DLQ contents for that run.
- Teach learners to verify input, output, DLQ, and checkpoints before comparing throughput.
- Present benchmark results as environment-specific observations, not platform guarantees.

## Success evidence

Both processors process the controlled run, output documents meet the expected shape, and no unexpected DLQ records remain. Throughput comparison is reported separately from correctness.

## Cleanup

Stop and drop both learner processors. Remove only records and collections allocated to the learner run; never clean up shared infrastructure.
