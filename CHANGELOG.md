# Changelog — `examples`

Date-based versions use `YYYYMMDD`.

## 20260428

### Added

- Initialized the public examples repository structure.
- Added the analog potentiometer to DALI red/white EventState example.
- Documented the ABCDE terminal wiring for the two potentiometers.
- Added a configurable `deadband` to prevent ADC jitter from spamming adjacent
  percentage values.
- Documented that project-level logarithmic correction should stay disabled
  when the connected DALI drivers are configured for linear dimming.
- Added the complete final TNGL pattern for the two-controller, two-room
  installation.

### Impact

- Spectoda has a dedicated public repository for reusable controller,
  scripting, and integration examples.
- The first controller example now includes both the Berry/EventState pattern
  and the physical wiring needed for commissioning.
- Potentiometer controls are stable near rounding boundaries while still
  emitting percentage EventState values.
- The example now captures the full commissioning path from ADC input through
  EventState brightness to the DALI driver dimming curve.
- The example can now be copied either as small Berry snippets or as one final
  TNGL block.
