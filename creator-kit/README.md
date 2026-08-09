# Spectoda Creator Kit 0.1.0-rc.4

This directory is the immutable source snapshot of the public Spectoda Creator
Kit prerelease. Download the packaged artifact from the matching
`creator-kit-v0.1.0-rc.4` GitHub prerelease in `Spectoda/examples`.

The bundle contains:

- seven selected English Controller Config and Creator Kit documents;
- the complete FW 0.12.11 Controller Config contract and JSON Schema under
  `assets/docs/controller-config/0.12.11/`;
- one copy-ready Event Player example under
  `examples/player-show-global-sparse-cues/`.

Read `bundle.json`, `manifest.json`, `source-lock.json`, `licenses.json` and
`checksums.sha256` before use. Documentation content is locked to
`Spectoda/documentation@6f6051686fe556a85318c7dd529ac061ab48c38d`; the
example is locked to
`Spectoda/examples@e4be6dd07814c1dc8816ffc0e4ea518532e411ec`. The firmware
config assets identify their own exact `Spectoda/firmware` provenance.

## Licensing

The selected documentation and Controller Config data are available under
CC BY 4.0; see `LICENSES/CC-BY-4.0.md` for attribution and scope. The bundled
example is available under MIT; see `LICENSES/MIT.txt`. Spectoda names, logos
and trademarks are not licensed by either content grant.

## Agent use

Codex and Claude should search `indexes/` and `manifest.json`, then cite exact
`documents/...`, `assets/...` or `examples/...` paths. The bundle is read-only
and must not be used to infer partner-local networks, credentials or current
installation state.

The GitHub prerelease does not publish the stable channel.
`stable-channel.json` deliberately remains `unpublished`; installing, updating
or rolling back an exact bundle version still requires partner approval.
