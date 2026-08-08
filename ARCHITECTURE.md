# Examples Architecture

## Purpose

`modules/examples` is a public Git-native repository for practical Spectoda
usage examples.

It collects small, reusable setups that are too specific for product
documentation, but valuable as copyable references for technicians, developers,
and partners.

## Source Of Truth

Git is the source of truth. Examples are authored directly in this repository.

Firebase is not an authoring store for this module.

## Layout

Examples are stored under `data/v2/` as the source of truth. Each example lives
in its own directory with an `example.yaml` metadata sidecar next to its
copyable source files:

```text
data/v2/examples/<example-slug>/
├── example.yaml          # metadata sidecar (title, category, tags, files…)
├── README.md
├── *.be
├── *.tngl
├── *.json
└── optional supporting files
```

The directory name should describe the use case, not the client.

This is a **lightweight content model**, not a strict business filesystem DB:
there is no `module-data.v2.json` yaml-only collection, because that validator
would reject the copyable `.be`/`.tngl`/`.json` source files. The model and the
rules for adding an example are documented in `data/v2/README.md`.

## App

`app/v2/` is the Examples v2 browsing app (React + Vite + TS), registered in the
Launchpad app registry on port `5305`. It reads `data/v2/examples/*/example.yaml`
and the referenced source files at build time via Vite `import.meta.glob` (no
runtime fetch, no Firebase) and renders a browsable, copyable catalog.

## Boundaries

- Product identity belongs in `modules/products`.
- Customer-facing documentation belongs in `modules/documentation`.
- Internal process guidance belongs in `modules/wiki`.
- Firmware source and runtime behavior belong in `modules/firmware`.

This repository can reference those sources, but should not become their
replacement.

## Creator Kit release boundary

`creator-kit/` is a generated, reviewable read-only distribution artifact. Its
source fixture and builder are intentionally synthetic-only until the
Documentation owner records a redistribution license. The private
`documentation` module remains the authority for Markdown/MDX and the
`agentExport` selection contract.

The candidate includes a versioned bundle schema, manifest, source lock,
license posture, compatibility contract, indexes, checksums and an
`unpublished` stable-channel descriptor. `scripts/creator-kit/validate.mjs`
checks public safety, links, hashes, size and the human-release gate. The
release candidate script produces a deterministic tar and provenance file but
does not publish a release, transfer public content or mutate a partner
Organization.

The only v1 transport contract is GitHub Releases plus the stable descriptor.
No embeddings, hosted dynamic RAG, central MCP gateway, writable
Documentation API or generic Lazurio installer belongs in this module.
