---
title: "Negative multiline HTML fixture"
summary: "Must reject an event handler that spans multiple lines."
agentExport:
  include: true
  audience: partner-maker
  license: spectoda-creator-kit-synthetic
  sourceLock: synthetic-fixture-2026-08-07
  publicDerivative: true
---
<img
  src="https://example.com/image.png"
  onerror="alert('unsafe')"
  alt="unsafe"
>
