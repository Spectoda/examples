# Spectoda Examples

Public examples of Spectoda controller setups, Berry scripts, project patterns,
and integration snippets.

This repository is intentionally example-first. Each example should be small
enough to copy into a real setup, but documented enough that a technician or
developer can see why the pieces are connected that way.

## Structure

- `controller-analog-potentiometer-dali-red-white/` - two analog
  potentiometers mapped to `white` and `red` EventStates for a two-room DALI
  setup.
- `controller-4i-group-toggle-dali-zones/` - a 4-input button controller
  pattern that toggles multiple `toggl` EventStates as one group, useful for
  DALI zones split across several controllers.

## Example Rules

Each example should include:

- a short `README.md` with the use case, wiring assumptions, and expected
  behavior
- source files that can be copied as-is where possible
- notes about controller config requirements
- anonymized or synthetic IDs unless the real IDs are intentionally part of the
  reusable example

Do not commit secrets, client credentials, private network keys, or
customer-specific data that is not meant to be public.
