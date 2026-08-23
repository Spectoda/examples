# Spectoda Creator Kit {{BUNDLE_VERSION}}

This directory is an immutable reviewed snapshot for the public Spectoda
Creator Kit stable release. The copy committed in `Spectoda/examples` remains
`candidate`. The protected release workflow creates a deterministic `released`
copy, verifies it in a draft release and only then publishes the packaged
artifact under the matching `creator-kit-v{{BUNDLE_VERSION}}` GitHub Release in
`Spectoda/examples`.

The bundle contains:

- seven selected English Controller Config and Creator Kit documents;
- the complete FW 0.12.11 Controller Config contract and JSON Schema under
  `assets/docs/controller-config/0.12.11/`;
- one copy-ready Event Player example under
  `examples/player-show-global-sparse-cues/`.

Read `bundle.json`, `manifest.json`, `source-lock.json`, `licenses.json` and
`checksums.sha256` before use. Documentation content is locked to
`Spectoda/documentation@{{DOCUMENTATION_COMMIT}}`; the
example is locked to
`Spectoda/examples@{{EXAMPLES_COMMIT}}`. The firmware
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

The stable GitHub Release does not publish the separate stable channel.
`stable-channel.json` deliberately remains `unpublished`; installing, updating
or rolling back an exact bundle version still requires partner approval.
