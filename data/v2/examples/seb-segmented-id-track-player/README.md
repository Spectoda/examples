# Timeline-Driven Segmented Single-ID SEB Track

This firmware 0.12.11 example keeps Player policy in Project Berry and uses the
native `SEB.land` component only as an atomic timed EventStore primitive.

The logical Track controls one state: `$brigh[ID1]`. It is represented by two
ordered 500 ms SEB segments:

| NetworkStorage file | Timeline start | Values |
|---|---:|---|
| `brigh-000.seb` | 0 ms | 0% at 0 ms, 75% at 100 ms, 100% at 500 ms |
| `brigh-001.seb` | 500 ms | 25% at 0 ms, 50% at 250 ms, 75% at 500 ms |

This outer ordered list is the Track. SEB itself has no Track name, file name,
ID-homogeneity, loop or seek flag.

## Requirements

- Firmware must be exactly **0.12.11** with final fixed-record SEB v1.
- Add `segmented-track-player.be` to the Project Berry on every participating
  Controller.
- Convert every `hex` string in `track-artifacts.json` to its exact binary
  bytes and upload it under the listed NetworkStorage filename.
- Start the shared timeline at `0 ms`, or seek to the explicitly supported
  `500 ms` checkpoint.

## Forward playback and pause

Berry polls `timeline.getState()`. For each active segment it derives one
stable local-millis `at` from `timeline.toMillis(segmentStart)`, keeps the
source cursor and calls `SEB.land` with an inclusive relative `until`.

While the timeline is paused, the plugin does not call the forward executor.
No future EventState is inserted into EventStore. On resume, due records are
processed with their original per-record Network clocks rather than the resume
time.

## Checkpoint seek

The example has state checkpoints at timeline `0 ms` and `500 ms`. A timeline
epoch discontinuity must match one of those explicit positions. Berry lands the
checkpoint scene at the seek time, then sets the next segment cursor to `1`
because the segment's offset-zero state is already represented by the
checkpoint.

SEB does not infer history and the Player does not replay skipped side effects.
Add another compiled checkpoint and its next `(segment, cursor)` position for
every additional seek target that the Project supports.

## Distributed landing

The reference Player uses `SEB.land` on all prepared Controllers. EventStore
remains the authority and provides its normal later synchronization. Use
`SEB.emit` only in a different design with one explicitly authoritative Player
source.

One SEB segment is limited to 65,535 ms and 240 records. Split longer or denser
Tracks in the outer Project list instead of changing the native format.
