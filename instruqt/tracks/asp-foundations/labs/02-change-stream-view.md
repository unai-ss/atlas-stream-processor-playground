# Lab 02: Change Stream delivery view

**Source:** [Processor snapshot](../../../projects/02-taco-tracking/processor.js)

## Learner outcome

Create sample delivery records, inspect their Change Stream events, and maintain a materialized view containing the latest state for each delivery.

## Instruqt adaptation

- Explain that a Change Stream observes changes made after the processor starts; seed fresh records during the exercise.
- Make the one-minute window and watermark behavior explicit in the learner steps.
- Verify the updated delivery after the window closes, including its distance and status.
- Keep seed data and collection names isolated to the learner run.

## Success evidence

The materialized view contains the expected delivery identifier and latest values after the window is emitted.

## Cleanup

Stop and drop the learner's processor and remove only the exercise's input and output data.
