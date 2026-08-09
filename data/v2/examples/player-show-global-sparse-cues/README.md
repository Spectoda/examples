# Global sparse-Cue Event Player with `player.show` SPM v3

This is the canonical copy-ready Project Berry Player for firmware **0.12.11**.
Studio compiles one `player.show` manifest and a deterministic chain of SEB
files named `player.000` through `player.999`. Every Controller reads the same
global mixed-ID stream and lands every Event value. Inject `player.be` directly
into every Controller Project. Its anonymous private scope registers the
`Plugin` callback immediately; there is no public callable or separate
invocation. The private scope also prevents Player helpers and state from
remaining as Controller globals. The plugin follows the shared timeline and
owns no clock of its own.

There is no file namespace or Controller ID configuration. A compiled SEB may
contain ID0–ID255, and all Controllers land all its records so normal playback
does not depend on EventStore anti-entropy to distribute omitted IDs.

## Authoring and Capture

A Track is the editing lane for one Spectoda ID. A Cue is intentionally sparse:
it contains only the Event values selected for that moment. One Cue may contain
only `toggl = 0%`, while another may contain a complete scene.

Capture uses exactly the IDs and Events checked in Studio's left EventStore
panel. That selection is saved with the Project and reused next time. Capture
reads the authoritative WASM EventStore in one operation; it does not fall back
to a React/JS mirror.

Studio merges all Tracks at the same timeline time into one atomic Cue Group.
A Cue Group is never split across SEB files. SEB stores Event values/records,
not EventStates.

## Fixed slots and exact versions

`player.show` SPM v3 is a compact exact-EOF manifest. Its 12-byte header stores
the show duration and segment count. Every following 10-byte entry stores:

- the exact required NetworkStorage version as unsigned48 little-endian; and
- the segment's absolute start in the shared timeline as unsigned32
  little-endian.

The filename is derived from the entry index and is not stored. Berry receives
NetworkStorage versions as exactly 12 lowercase hexadecimal characters and
compares them without numeric conversion.

A Controller activates only when every local `player.NNN` has the exact version
pinned by its local manifest, every referenced SEB has a valid exact EOF, and
the absolute segment windows do not overlap. Until then it stays locally
inactive and retries after normal NetworkStorage propagation.

## Upload

Click **Upload** in Studio. Upload does not pause, rewind, seek, resume or gate
the Play button.

1. Studio compiles and preflights the complete show before any mutation.
2. Exact unchanged slot bytes reuse the resident slot version.
3. Changed slots receive a version greater than the observed version.
4. Studio writes and reads back a newer `player.show` first.
5. Studio broadcasts only changed `player.NNN` slots and verifies App Controller
   readback.

The new manifest can arrive before its changed slots. This is intentional: exact
version checks keep that Controller inactive until the pinned set is complete.
Studio reports App Controller readback only; it does not claim that every mesh
member has already synchronized.

Fixed filenames replace prior payloads instead of accumulating one new name per
edit. Unused trailing slots may remain at the previous high-water mark; they are
not referenced by the current manifest and do not affect activation.

## Playback, pause and seek

The plugin polls metadata at a bounded cadence and retains only the compact
manifest plus cursor state. The raw six-byte versions deliberately remain
packed in the manifest; expanding them to 12 ASCII bytes would add six retained
bytes per segment. Metadata is scanned without building a second Berry map.

Activation validates SEB headers and exact EOF with small ranged reads. Native
`SEB.land` performs the complete record validation before applying anything.
Seek examines at most 32 records (384 bytes) at once instead of loading a whole
SEB into Berry. Playback then passes filenames directly to:

```berry
SEB.land("player.000", {
  "source": "networkStorage",
  "at": timeline.at(segment_start),
  "cursor": cursor,
  "until": due_offset
})
```

An ordinary pause without movement lands nothing. A timeline discontinuity,
including a seek or 24-hour wrap while paused, lands the last complete Cue Group
whose time is at or before the target. It lands exactly once at the causal time
of the seek and advances the cursor past that Group, so resume does not repeat
it. Resume recomputes `timeline.at(segment_start)`, so paused wall time remains
reflected in later causal timestamps.

Seek reconciliation is deliberately sparse:

- Berry uses manifest `startMs` values to choose the relevant segment;
- an exact-target Cue is selected, otherwise the immediately preceding Cue is;
- a future Cue is never selected;
- only that one Cue Group is landed, including while the timeline is paused;
- older Cue Groups are not replayed;
- EventStore is not cleared and no complete state is synthesized.

Because Cues are sparse, Events omitted from the selected Cue retain their
existing EventStates. Authors should use a complete Cue wherever an arbitrary
seek must recreate a complete visual state. Loop, epoch changes and the 24-hour
timeline wrap discard stale cursor state and apply the same reconciliation
rule.

## Limits

- one same-time Cue Group contains 1–340 Event values across all IDs;
- a Cue Group is never split;
- one SEB contains at most 340 records and 4,092 bytes;
- a segment starts at its first Cue Group and ends before the next Group would
  exceed 340 records or a relative offset of 65,535 ms;
- generated filenames are exactly `player.000` through `player.999`;
- one Player turn performs at most one native SEB landing;
- malformed manifests, missing/mismatched versions and malformed SEBs fail
  inactive.

The directly injectable script fits one 4 KiB TNGL block. Short
local names and positional runtime arrays are intentional consequences of that
hard limit; 1 KiB remains only a stretch measurement.

`player-show-artifacts.json` is a public synthetic SPM v3 corpus with sparse Cue
Groups across ID1, ID2 and global ID255. It is illustrative compiled output;
the Studio Project remains the authoring source of truth.

For causal scene recall, use the separate `seb-causal-scene-recall` example. A
scene is an ordinary SEB landed at its trigger Event time and is independent of
this timeline Player.
