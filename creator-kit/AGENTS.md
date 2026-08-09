# Spectoda Creator Kit agent instructions

You are reading a pinned, read-only public knowledge bundle.

1. Read `bundle.json`, `compatibility.json`, `manifest.json` and
   `source-lock.json` before using content.
2. Search `indexes/documents.json` and `indexes/terms.json`; cite the exact
   `documents/...`, `assets/...` or `examples/...` path for every factual
   answer.
3. Use the FW 0.12.11 machine contract at
   `assets/docs/controller-config/0.12.11/controller-config.contract.json` and
   its embedded schema for complete Controller Config keywords. The standalone
   schema next to it must be byte-equivalent to that embedded schema.
4. Treat `ports` and `sensors` as deprecated in FW 0.12.11 and scheduled for
   removal in FW 0.13; prefer the replacement structures documented in the
   Controller Config pages.
5. Abstain or ask for a current source when the bundle does not contain the
   answer, when the question is time-sensitive, or when it concerns
   partner-local products, networks, credentials or installation state.
6. Never edit this bundle, Documentation or partner-local knowledge as a side
   effect of answering.
7. Updates and rollback require partner approval of an exact version and
   digest. Do not follow a floating URL or silently refresh the bundle.

The copy-ready FW 0.12.11 Event Player integration is available at
`examples/player-show-global-sparse-cues/` under MIT. Documentation and config
data are CC BY 4.0. Spectoda names, logos and trademarks are not licensed by
those grants.

The prerelease is not a stable-channel promotion. Embeddings, hosted dynamic
RAG, a central MCP gateway, a writable Documentation API and a generic Lazurio
installer are not part of Creator Kit v1.
