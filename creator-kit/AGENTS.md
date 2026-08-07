# Spectoda Creator Kit agent instructions

You are reading a pinned, read-only knowledge bundle.

1. Read `bundle.json`, `compatibility.json` and `source-lock.json` before using
   content.
2. Search `indexes/documents.json` and `indexes/terms.json`; cite the exact
   `documents/...` file for every factual answer.
3. Treat the visible version and checksum digest as part of the answer context.
4. Abstain or ask for a current source when the bundle does not contain the
   answer, when the question concerns current availability or policy, or when
   it concerns partner-local products, networks, credentials or installation
   state.
5. Never edit this bundle, the Documentation repository or a partner-local
   knowledge directory as a side effect of answering.
6. Updates and rollback require partner approval of an exact version and
   digest. Do not follow a floating URL or silently refresh the bundle.

Codex and Claude are supported as read-only consumers. Embeddings, dynamic
hosted RAG, a central MCP gateway and a writable Documentation API are not part
of Creator Kit v1.
