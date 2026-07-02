# Changelog — `examples`

Date-based versions use `YYYYMMDD`.

## 20260702

### Added

- Added the GLEDOPTO GL-RC-001WL ESP-NOW remote example to the `data/v2`
  catalog, including single-ID, direct/indirect, and S1/S2/S3/S4 two-ID
  selection Berry helpers.
- Added copyable TNGL usage snippets, a standalone Controller Berry upload
  script for the two-ID selection variant, and `example.yaml` metadata for the
  Examples v2 browsing app.

### Impact

- Technicians can map the GLEDOPTO remote through
  `espnow.rx(filter, callback)` while keeping normal Controller-to-Controller
  ESP-NOW communication active.
- The example documents safe bring-up with placeholder MACs, optional MAC
  locking, and debug `mac1`/`mac2`/`mac3` LABEL EventStates for reading the
  physical remote MAC during commissioning.

## 20260616

### Added

- Added the **Examples v2** browsing app (`app/v2/`), launchable from the
  Spectoda Launchpad on port `5305`. It lets Spectoda people browse the examples
  by category, filter by name/tag/keyword, read each example's notes, and copy
  its source files.
- Styled the app in the Spectoda design system, aligned with the Marketing v2
  app: dark `#0B0E14` surface with the brand purple hero glow, the official
  Spectoda brand mark, Manrope typography, a `color-mix` surface/token system,
  gradient hero heading, and translucent panels and cards. The licensed Baste
  display font is intentionally not bundled (public repo); Manrope weight 300
  carries the display headings.
- Moved the example source of truth into `data/v2/examples/<slug>/` and added an
  `example.yaml` metadata sidecar to each example (title, category, summary,
  tags, hardware notes, file list).
- Added `data/v2/README.md` documenting the lightweight content model and how to
  add a new example.

### Impact

- Spectoda people can now find and copy controller, Berry, TNGL and App-pattern
  examples from a single Launchpad app instead of digging through repo folders.
- Example files stay copyable and Git-native; the app is read-only and authoring
  an example is unchanged (add a folder + `example.yaml` under `data/v2`).
- The restructure preserves every existing example and its files (Git-tracked
  renames); the public-safety rules are unchanged.

## 20260611

### Added

- Added an SC 4i latching wall switch example for mapping stable on/off switch
  state to `EVS("toggl", id)`.
- Added the reusable `LatchingSwitchState(...)` Berry helper.
- Added a copyable SC 4i usage snippet for `SW1..SW4` and a compact TNGL
  project fragment with illustrative DALI zones.
- Added a push-button click-and-hold DALI dimmer example where short clicks
  toggle on/off and long holds change `brigh`.
- Added the reusable `PushButtonClickHoldDimmer(...)` Berry helper.
- Added `dim_min` support so hold-dimming can stop above `0%` while short-click
  off still writes `0%`.
- Raised the default click/hold threshold for the push-button dimmer to
  `600 ms` and kept the remembered ON brightness above `dim_min`.

### Impact

- Technicians can use normal wall switches without spring return as stateful
  Spectoda controls instead of treating them as momentary click buttons.
- The helper writes on script start and on physical switch changes, while
  avoiding continuous loop rewrites of unchanged values.
- Technicians can use one spring-return wall button for both simple on/off and
  gradual brightness control without combining multiple helpers on the same
  input.
- Hold-dimming can avoid turning the light fully off at the bottom of the
  brightness range.
- Short-click ON now restores the last brightness above the dimming floor
  instead of returning to `dim_min`.

## 20260603

### Added

- Added a public `network-nested-element-groups` example for Spectoda App
  `elementsJson`, `controlPages`, and homepage section authoring.
- Added copyable `elements-json.json`, `control-pages.json`, and
  `network-fragment.json` files for group -> groups -> devices navigation.

### Impact

- Integrators can reuse a validated nested element-group pattern without
  copying customer-specific network data.
- The example documents the `expandedElements` rule that each inline child must
  be a direct `childElementIds` entry and must expose the referenced control
  page.

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
