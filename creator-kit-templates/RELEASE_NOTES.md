# Spectoda Creator Kit 0.1.0-rc.4 public prerelease

This candidate updates the public Creator Kit with the final FW 0.12.11 sparse
global Event Player, its final WASM compatibility pin and consistent `-1`
disconnected-pin semantics. It supersedes `0.1.0-rc.3`; the earlier archive
remains unchanged and available by its exact release tag.

It includes the complete documented FW 0.12.11 Controller Config surface,
machine-readable contract and JSON Schema, plus the MIT-licensed Event Player
example. GPIO-valued fields now document and validate `-1` consistently as an
intentionally disconnected pin while preserving connected-pin capability
ranges. Documentation and config data are licensed under CC BY 4.0. Spectoda
names, logos and trademarks are excluded from the license grant.

The archive is deterministic and ships with a SHA-256 sidecar and provenance
record. Verify the archive digest before use. The stable channel remains
unpublished; this prerelease does not opt any partner into automatic updates.
