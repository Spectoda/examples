# Spectoda Examples

Public examples of Spectoda controller setups, Berry scripts, project patterns,
and integration snippets.

This repository is intentionally example-first. Each example should be small
enough to copy into a real setup, but documented enough that a technician or
developer can see why the pieces are connected that way.

## Browsing app

`app/v2/` is the **Examples v2** browsing app — a React + Vite + TS single-page
app, launchable from the Spectoda Launchpad (port `24708`). It reads the examples
from `data/v2/` at build time and lets Spectoda people browse them by category,
filter by name/tag/keyword, read each example's notes, and copy its source files.

Runtime otevři přes **Start/Open** u Examples v centrálním Conglomerate
Launchpadu. Závislosti lze připravit přes `cd app/v2 && bun install`; port
`24708` vlastní kořenový module lease.

## Structure

Examples are stored as the source of truth in `data/v2/`. Each example is a
folder with its copyable source files plus an `example.yaml` metadata sidecar
that the browsing app reads. See [`data/v2/README.md`](data/v2/README.md) for
the content model and how to add a new example.

```text
data/v2/examples/
├── controller-analog-potentiometer-dali-red-white/  # two analog pots → white/red EventStates (two-room DALI)
├── controller-4i-group-toggle-dali-zones/           # one 4-input button toggling many toggl EventStates as a group
├── controller-latching-switch-state-dali/           # latching on/off wall switch → toggl EventState state
├── controller-push-button-click-hold-dim-dali/      # momentary push button: short click toggles, hold dims brigh
├── controller-toggle-button-hold-dim-dali/          # single toggle button ramps DALI brightness, reverses on press
├── gledopto-gl-rc-001wl-espnow-remote/              # Berry espnow.rx examples for a GLEDOPTO GL-RC-001WL remote
├── network-nested-element-groups/                   # App elementsJson + controlPages group → groups → devices pattern
├── seb-causal-scene-recall/                         # recall a mixed-ID SEB scene at the causal event time
└── player-show-global-sparse-cues/                  # global mixed-ID Player with sparse Cues
```

## Example Rules

Each example should include:

- a short `README.md` with the use case, wiring assumptions, and expected
  behavior
- an `example.yaml` metadata sidecar (title, category, summary, tags, hardware
  notes, file list) so the browsing app can render it
- source files that can be copied as-is where possible
- notes about controller config requirements
- anonymized or synthetic IDs unless the real IDs are intentionally part of the
  reusable example

Do not commit secrets, client credentials, private network keys, or
customer-specific data that is not meant to be public.

## Spectoda Creator Kit public prerelease

`creator-kit/` is the review candidate for the public English Spectoda Creator
Kit `0.1.0-rc.4` prerelease. It contains the complete selected
FW 0.12.11 Controller Config documentation and machine-readable config
contract/schema under CC BY 4.0, plus one MIT-licensed Event Player example.
Documentation remains the private authoring source of truth; this repository
holds only the reviewed one-way public derivative.

The prerelease is read-only and uses exact source commits, firmware provenance,
manifests, indexes, checksums and a protected release gate. The stable-channel
descriptor remains `unpublished`; partner-local knowledge stays outside the
bundle. Native Lazurio installation is intentionally not implemented here.

Run the local gates from the repository root:

```bash
bun run creator-kit:build
bun run creator-kit:check
```

`creator-kit:build` creates only a local deterministic archive under the
ignored `.creator-kit-tmp/`; it does not call GitHub Releases. The public
latest published prerelease remains
[`creator-kit-v0.1.0-rc.3`](https://github.com/Spectoda/examples/releases/tag/creator-kit-v0.1.0-rc.3)
until the protected publication workflow is explicitly approved for rc.4.
