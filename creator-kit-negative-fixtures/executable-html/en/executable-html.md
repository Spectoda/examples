---
title: "Negative executable HTML fixture"
summary: "Must be rejected by the raw HTML safety gate."
agentExport:
  include: true
  audience: partner-maker
  license: spectoda-creator-kit-synthetic
  sourceLock: synthetic-fixture-2026-08-07
  publicDerivative: true
---
<img src="https://example.com/image.png" onerror="alert('unsafe')" alt="unsafe">
