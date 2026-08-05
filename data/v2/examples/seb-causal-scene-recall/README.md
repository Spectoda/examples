# Causal NetworkStorage Scene Recall with SEB

This firmware 0.12.11 example turns a normal LABEL EventState into a local
multi-event scene on every prepared Controller.

An authoritative source emits:

```berry
spectoda.emitEvent("scene", "sce01", ID255, 31)
```

`scene-recall.be` observes `$scene[ID255]`, loads `sce01.seb` from local
NetworkStorage and calls `SEB.land` with the callback's exact `event_millis`.
All zero-offset scene records therefore receive the same causal Network clock
as the event that requested the scene.

## Requirements

- Firmware must be exactly **0.12.11** with the final fixed-record SEB v1 API.
- Add `scene-recall.be` to the Project Berry loaded on every participating
  Controller.
- Upload the exact bytes from the `hex` field in `sce01.seb.json` as a binary
  NetworkStorage file named `sce01.seb` on those Controllers.
- The trigger EventState is `$scene[ID255]` with a LABEL value.
- Do not include `$scene[ID255]` in the compiled scene, or recall would recurse.

The synthetic scene changes:

- `$brigh[ID255]` to `50%`
- `$color[ID1]` to `#112233` with priority `7`

SEB still uses EventStore as the only state authority. A Controller that misses
the simultaneous local landing may converge later through normal EventStore
synchronization.

## `SEB.land`, not `SEB.emit`

The same Project script runs on multiple Controllers, so it must use
`SEB.land`. Calling `SEB.emit` independently from all of them would multiply
network traffic and duplicate authoritative emissions. Reserve `SEB.emit` for
one deliberately selected source.

## Failure and retry behavior

The scene is validated and its complete deduplicated contribution is reserved
before EventStore changes. A validation, time-conversion or queue-capacity
failure applies nothing and returns a named error. The example logs that error;
a production Project can retry the same `(bytes, at)` pair after the runtime
queue has drained.

The provisional variable-record blob from the earlier unreleased development
work is not accepted by this firmware version. Recompile every scene together
with the Project plugin before using 0.12.11.
