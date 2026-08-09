The **Spectoda Creator Kit** is a read-only, reviewable knowledge bundle for
makers who build with Spectoda. The first release is English and is designed to
be used by a person together with Codex or Claude.

## Release status

Public artifacts use exact `creator-kit-v<version>` GitHub prerelease tags in
the public `Spectoda/examples` repository. The initial public artifact was
`creator-kit-v0.1.0-rc.3`; later candidates must use a new immutable version
instead of replacing it. Read `bundle.json` and `source-lock.json` to identify
the exact installed version, source revisions and hashes. A prerelease is not
installed into a partner Organization automatically.

The supported v1 transport is a GitHub Release plus its read-only
`stable-channel.json` descriptor. Every installation must name an exact bundle
version and verify the published digest and `checksums.sha256` file. Updates are
partner-approved; there is no floating or silently refreshed channel.

## What the bundle contains

- normalized English Markdown documents selected by an explicit
  `agentExport.include: true` marker;
- a manifest, source lock, document and term indexes, compatibility contract,
  license posture and checksums;
- `README.md` and `AGENTS.md` with the same version and verification rules;
- the firmware 0.12.11 Controller Config contract and JSON Schema under
  `assets/docs/controller-config/0.12.11/`;
- no embeddings, hosted dynamic RAG, central MCP gateway or writable
  Documentation API.

The Documentation repository remains the authoritative source. The Examples
repository is only the reviewed distribution surface and must not become a
second Documentation authoring store.

## Using the bundle with an agent

1. Tell the agent the exact installed Creator Kit version and digest.
2. Ask it to search the bundle manifest and indexes before answering.
3. Require citations to the exact `documents/...` path and a clear distinction
   between bundle knowledge and current information.
4. The agent must abstain or ask for a current source when the answer is not in
   the bundle, is time-sensitive, or concerns private partner-local knowledge.

Keep partner-local product notes in a separate local directory or repository.
Creator Kit updates and rollback must never overwrite those notes.

## Installation, update and rollback

Use only a verified GitHub Release and the installation procedure supplied with
that release. A native Lazurio installer is not part of this release; its
generic GitHub Release install/pin/verify/update/rollback contract must be
approved by HumanAndMachines/Lazurio in a separate planning flow before it is
documented as a supported command.

For an update, review the new version, digest, compatibility file and checksums
with the partner, then approve that exact version. For rollback, restore the
last verified digest and record the reason. Never replace a bundle because a
remote endpoint happens to serve a newer version.

## License and attribution

Documentation text and the Controller Config contract/schema data in the bundle
are licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
Program code and Examples remain under MIT. Attribute the documentation to
Spectoda, link the license and source, and indicate changes. These licenses do
not grant rights to Spectoda names, logos or other trademarks.

## Support boundary

Creator Kit knowledge is a read-only aid for creation and troubleshooting. It
does not grant access to a Network, change a controller, publish Documentation,
or authorize a release. Follow the current Spectoda product and safety
documentation for live installations and ask Spectoda support when the bundle
is incomplete or stale.
