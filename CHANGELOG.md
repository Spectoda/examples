# Changelog — `examples`

Date-based versions use `YYYYMMDD`.

## 20260810

### Changed

- Simplified the Event Player to one global mixed-ID stream. Tracks remain
  per-ID authoring lanes while sparse Cues contain only the Event values
  selected for that moment.
- Replaced the unreleased per-ID and content-addressed Player prototypes with
  the compact SPM v3 manifest and fixed `player.000` through `player.999`
  slots. Every manifest entry pins the exact 48-bit NetworkStorage version and
  absolute segment start.
- Retired the parallel segmented single-ID Player example. The global sparse
  Player is the single canonical Project Berry plugin; causal scene recall
  remains a separate timeline-independent example.
- The directly injectable Berry script now reconciles exactly one Cue Group at
  or immediately before a timeline discontinuity. It does not select future
  Cues or replay older history, and Events omitted from the sparse Cue retain
  their EventStates.
- Prepared Creator Kit `0.1.0-rc.4` with the final
  `DEBUG_UNIVERSAL_0.12.11_20260810` compatibility pin. No release or stable
  channel promotion is implied by the candidate.

## 20260809

### Added

- Published the immutable Creator Kit `0.1.0-rc.3` source snapshot with seven
  CC BY 4.0 Controller Config/Creator Kit documents, the complete FW 0.12.11
  config contract plus JSON Schema, and one MIT Event Player example.

### Changed

- Release automation now publishes an explicit GitHub prerelease while the
  stable-channel descriptor remains unpublished.
- Public CI verifies Documentation, Firmware and Examples provenance plus all
  bundle/archive checksums without requiring access to private Documentation.

## 20260808

### Changed

- Replaced the unreleased A/B Player bundle with the canonical firmware 0.12.11
  Project Berry Player for one static `player.show` and deterministic per-ID
  SEB chains.
- Added a public synthetic three-Track Show Index/SEB corpus and a host Berry
  lifecycle regression for filtering, pause/resume, retry, seek and 24-hour
  wrap behavior.

### Impact

- Creator Kit and Studio can point to one small copy-ready plugin. Projects keep
  Player policy in optional Berry while native SEB remains a reusable atomic
  Event-value primitive and EventStore stays authoritative.
- The supported operator flow is explicit: pause, upload, wait for ordinary
  NetworkStorage propagation, rewind and play. There is no generation or hot
  update protocol in v1.

## 20260807

### Added

- Added a reviewable English Spectoda Creator Kit candidate with a fail-closed
  synthetic-only build, manifest, source lock, checksums, compatibility,
  indexes, stable-channel contract and in-bundle README/AGENTS.md.
- Added deterministic release assets/provenance, public-safety/link/secret/
  license/size gates, negative behavior tests and Codex/Claude-shaped
  agent-objective harness. Release and generated public-content workflows are
  protected and were not triggered.

### Verification

- `bun run creator-kit:check`
- `bun run creator-kit:build`
- Candidate CI fetches full history before checking the committed source lock,
  so ancestry validation remains fail-closed on a fresh GitHub Actions checkout.

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
