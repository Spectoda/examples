# Spectoda Creator Kit

This directory is a reviewable **release candidate** for the English Spectoda
Creator Kit. It is read-only and intentionally contains synthetic public-safe
fixture content plus one public MIT-licensed Event Player example. It is not a published GitHub Release and it must not be
installed into a partner Organization until a Steward/Admin approves a release
and the Documentation redistribution license is recorded.

The bundle is generated from one exact source commit. Verify the version,
`source-lock.json`, `checksums.sha256` and the bundle digest before use. Updates
are exact-version and partner-approved. `stable-channel.json` is the v1
read-only transport descriptor; its current state is `unpublished`.

The Documentation repository remains the private document authority. The
copy-ready Event Player plugin under
`examples/player-bundle-ab-complete-cue-tracks/` is copied byte-for-byte from
its canonical `Spectoda/examples` source at the locked commit. Partner-local product
knowledge belongs in a separate sibling directory and is never overwritten by
Creator Kit updates or rollback.

## Agent use

Codex and Claude may search `manifest.json` and `indexes/` first, then cite the
exact `documents/...` path. They must say when a fact is missing or stale,
abstain on private partner-local questions and request a current source for
time-sensitive information. The bundle has no write path to Documentation or
to an Organization.

For the firmware 0.12.11 Event Player setup, cite and follow
`examples/player-bundle-ab-complete-cue-tracks/README.md`. Add the accompanying
`player-bundle.be` to each Controller Project; uploading a Player bundle does
not install the Project Berry plugin.

## Supported transport

v1 uses GitHub Releases plus a stable-channel descriptor. A native Lazurio
installer is not part of this candidate. Do not invent Lazurio commands; the
generic verified install/pin/update/rollback contract must be approved by the
HumanAndMachines/Lazurio owner in a separate planning flow.
