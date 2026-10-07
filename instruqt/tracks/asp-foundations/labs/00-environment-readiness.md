# Lab 00: Environment readiness

**Source:** [`projects/00-assessment`](../../../../projects/00-assessment/)

## Learner outcome

Confirm the test Atlas project, ASP workspace, required connections, and database permissions are available before running processors.

## Instruqt adaptation

- Present this as a readiness gate, not as a request for learners to enter or paste credentials.
- Check the environment's preconfigured access using a non-destructive command or fixture.
- Report missing prerequisites clearly and stop the track step if the environment is not ready.
- Keep the existing automated-assessment contract as a separate future exercise unless the track needs to assess learner-submitted processors.

## Success evidence

The workspace and expected connections are available, the learner can run the approved read/write smoke check, and no secret value is printed.

## Cleanup

Do not remove shared Atlas or ASP infrastructure from a readiness check. Clean up only temporary test data created by that check.
