# Complete-Cue Track Player from `player.show`

This is the canonical copy-ready Project Berry Player for firmware **0.12.11**.
Studio compiles one static `<base>.show` index and deterministic per-ID SEB
chains. The plugin follows the shared timeline; it owns no start, seek or loop
clock of its own.

```berry
Player({"base": "player", "ids": [1], "debug": false})
```

Configure `ids` with only the local Spectoda IDs 0–254 owned by this Controller.
ID255 is selected automatically when the Show Index contains it. NetworkStorage
still synchronizes every file to every Controller; the plugin opens only ID255
and its configured local IDs.

## Authoring and upload

One Track owns one Spectoda ID. Its Event definitions are stable across the
Track, and every Cue supplies one complete type-correct value for every enabled
Event. SEB files contain those encoded Event values/records; landing them
produces normal EventStore updates.

Use Studio's Event Player to Capture and edit Cues, then follow this workflow:

1. pause the shared timeline;
2. upload the changed SEB files and `<base>.show`;
3. wait for ordinary NetworkStorage propagation — App Controller readback does
   not prove the whole mesh is ready;
4. rewind the shared timeline;
5. play.

Hot update and simultaneous writers for the same base are unsupported in v1.
Old deterministic files no longer referenced by `<base>.show` are ignored.

## Runtime behavior and limits

The plugin reads only the bounded Show Index into Berry. Each SEB payload is
read and atomically landed by the native `SEB.land(filename,
{"source":"networkStorage", ...})` path, without a Berry payload buffer.

- one complete Cue contains 1–340 Event values;
- one SEB file is at most 4,092 bytes and spans at most 65,535 ms;
- `<base>.show` is exact-EOF validated and at most 4,096 bytes;
- the base is 1–11 safe ASCII characters and generated names are at most 23
  bytes;
- one plugin turn performs at most one SEB contribution;
- pause performs no landing; resume derives a fresh timeline projection;
- seek, rewind, loop and the 24-hour timeline wrap reconcile the last complete
  Cue at or before the target.

The canonical compact source compiles to a 3,789-byte TNGL BERRY payload
(3,785 source bytes plus framing), 307 bytes below the 4 KiB hard limit. The
1 KiB target remains a stretch measurement, not a correctness promise.

`player-show-artifacts.json` is a public synthetic three-Track corpus used by
the Berry smoke. It is illustrative compiled output; Project data remains the
authoring source of truth.

For causal scene recall, use the separate `seb-causal-scene-recall` example. A
scene is an ordinary SEB file landed at its trigger Event time and is independent
of the timeline Player.
