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
local-millis `at` from `timeline.at(segmentStart)`, keeps the
source cursor and calls `SEB.land` with an inclusive relative `until`.

While the timeline is paused, the plugin does not call the forward executor.
No future EventState is inserted into EventStore. Resume keeps the timeline
epoch but creates a new causal projection. The plugin reopens timing for the
remaining source suffix, so future record clocks include wall-clock time spent
paused. Seek or loop changes the epoch and reconstructs both timing and cursor
from a complete checkpoint.

`timeline.at(position)` projects the current `(timeline position P, Network
clock C)` reference as `C + (position - P)`. It returns a signed wrapping local
millis token, or `nil` outside the unambiguous ±2^31 ms conversion window.
Timeline position itself is a 24-hour ring (`0..86,399,999`), independent from
the local token's 32-bit wrap. Midnight stays continuous for Players, Layers
and animations; an exact 12-hour position difference is ambiguous.

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

One SEB segment is limited to 65,535 ms and 340 records (4,092 bytes within one
4,096-byte LittleFS data-block budget). One atomic due contribution accepts the
full 340-record SEB. A 341st pending event fails before queue, EventStore or
cursor mutation. Split longer Tracks in the outer Project list instead of
changing the native format.
