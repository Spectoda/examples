# Spectoda Creator Kit 0.1.0 public stable release

This is the first stable public Creator Kit release. It keeps the reviewed FW
0.12.11 sparse global Event Player and its exact WASM compatibility pin, and it
adds the current Controller Config contract for explicit disabled declarations.
The earlier `0.1.0-rc.3` and `0.1.0-rc.4` archives remain unchanged and
available by their exact release tags.

It includes the complete documented FW 0.12.11 Controller Config surface,
machine-readable contract and JSON Schema, plus the MIT-licensed Event Player
example. GPIO-valued fields document `-1` as intentionally disconnected; the
leading `_` decorator preserves a configured pin while disabling it, `type:
"NC"` marks an intentionally unconfigured I/O, and button inversion uses the
canonical `btn` keyword. Documentation and config data are licensed under CC
BY 4.0. Spectoda names, logos and trademarks are excluded from the license
grant.

The archive is deterministic and ships with a SHA-256 sidecar and provenance
record. Verify the archive digest before use. The separate stable channel
remains unpublished; this release does not opt any partner into automatic
updates.
