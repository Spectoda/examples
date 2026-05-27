# Changelog — `examples`

Date-based versions use `YYYYMMDD`.

## 20260527

### Added

- Added a toggle button hold-dimming example for one DALI lamp zone.
- Added the reusable `ToggleButtonDimmer(...)` Berry helper.
- Added a copyable single-controller usage snippet and illustrative controller
  config.
- Added a compact TNGL project fragment showing `brigh` EventState brightness
  control.

### Impact

- Technicians can reuse one digital lamp-style toggle input for gradual dimming
  instead of only simple on/off control.
- The helper preserves the current brightness on release and reverses direction
  on the next press, including endpoint handling at `0%` and `100%`.

## 20260520

### Added

- Added a 4-input controller example for group toggling multiple DALI zone
  EventStates with one click.
- Added the reusable `OnClickToggleGroup(...)` Berry helper.
- Added mirrored `4I_01` and `4I_02` usage snippets for `SW1` and `SW2`.
- Added a compact TNGL project fragment showing `ID1..ID12` DALI segment
  mapping.

### Impact

- Technicians can copy a group toggle pattern that normalizes mixed on/off
  states instead of swapping them between IDs.
- Repeated single-target `OnClickToggle(...)` calls can now be replaced by one
  logical group toggle per button input.

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
