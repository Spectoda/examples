# A/B Snapshot Track Player from NetworkStorage

This copy-ready Project Berry example plays the final SPM/SPT v1 bundle format
on firmware **0.12.11**. The shared Spectoda timeline is the only transport:
play, pause, seek, rewind, and loop require no separate Player events.

Each SPT is one Spectoda ID. Each Cue is a complete snapshot of every stable
typed channel in that Track. The plugin automatically includes a global ID255
Track when the selected generation contains one, then adds only the local IDs
configured for this Controller.

```berry
PlayerBundle({"namespace": "demo", "ids": [1], "debug": false})
```

Configure local IDs only in the range 0–254. Never put `255` in `ids`; global
ID255 is discovered automatically. A Controller which owns IDs 1 and 7 uses
`{"ids": [1, 7]}`. Another Controller may use `{"ids": [2]}` while all of the
same NetworkStorage files still synchronize to both Controllers.

## Files and publication order

For namespace `demo`, the manifest is `demo.spm`; Track files are named
`demo.<a|b>.<000-255>.spt`. `player-bundle-artifacts.json` contains a synthetic
two-generation show as exact binary hex:

- slot A is the fallback generation;
- slot B is the preferred generation;
- both generations contain ID255 and ID1;
- the ID1 brightness snapshot changes in generation B.

Convert each `hex` value to exact bytes and upload it with the listed filename
and `version`. A real Studio deployment writes every changed inactive-slot SPT,
reads back its exact bytes/fingerprint, and writes the SPM **last**. Do not hand
edit revisions or fingerprints.

The plugin watches only the active manifest and relevant active Track files.
Inactive-slot uploads therefore do not interrupt a running show. Once SPM
changes, playback halts. The new preferred generation is selected only after
ID255 (when present) and every configured local SPT match their manifest ID,
artifact revision, exact size, and NetworkStorage fingerprint. An incomplete
preferred generation keeps a complete fallback. Reconciliation after an
artifact change deliberately waits for the shared timeline to be paused.

## Runtime behavior

The plugin range-reads the manifest, SPT headers/directories, and individual
SEB segments. It never loads a whole large SPT into one Berry `bytes()` value.
Every embedded SEB receives native fail-closed validation before a generation
can activate. Seek, rewind, and loop binary-search the last Cue at or before the
timeline target and land that complete snapshot at the transport's causal local
millis. Forward playback keeps the exact `(SEB bytes, at, cursor)` tuple until
the segment changes. One local timeline-zero mapping is frozen per
epoch/discontinuity and refreshed when a paused timeline resumes. Equal Cue
times in separate Track files therefore receive the same causal timestamp even
when those Tracks execute on different Plugin turns, while time spent paused is
still reflected in later Cue clocks.

At most one `SEB.land` execution occurs per Plugin turn. A complete Cue can
therefore use the full firmware 0.12.11 limit of **340 event values** without
competing with another Track in the same transient queue. A Cue is never split.
Future records remain outside EventStore until their timeline offsets are due.

## Requirements and limits

- firmware exactly 0.12.11 with final SEB v1 and SPM/SPT v1 support;
- every enabled Track starts with a complete Cue at timeline `0 ms`;
- one SEB segment is at most 4,092 bytes, 340 records, and 65,535 ms;
- one SPT is at most 65,535 bytes, but Studio's measured
  `maxTrackPayloadBytes`, bundle, metadata, and free-flash gates may be lower;
- NetworkStorage fingerprints are HMAC-SHA256 with UTF-8 key `fingerprint`;
- this distributed Player uses `SEB.land`; do not replace it with `SEB.emit`
  on every Controller.

Turn `debug` on only while commissioning. The example contains no network key,
MAC address, customer name, or other private installation data.

## Isolated DEVKIT end-to-end runner

`player-bundle-devkit-smoke.mts` uses the real NodeSerial connector and App
Controller API. It refuses all writes unless you pass an explicit serial port,
the exact monorepo checkout, and `--confirm-isolated-devkit`:

```bash
cd /path/to/Spectoda-monorepo
SPECTODA_WASM_VERSION=DEBUG_DEV_0.12.11_YYYYMMDD \
node_modules/.bin/tsx \
  /path/to/examples/data/v2/examples/player-bundle-ab-snapshot-tracks/player-bundle-devkit-smoke.mts \
  --monorepo=/path/to/Spectoda-monorepo \
  --path=/dev/cu.usbserial-XXXX \
  --confirm-isolated-devkit \
  --evidence=/tmp/player-bundle-smoke.json
```

Equivalent environment options are `SPECTODA_MONOREPO`,
`SPECTODA_SERIAL_PATH`, and `SPECTODA_WASM_VERSION`. Optional CLI settings are
`--baudrate`, `--scan-timeout`, `--poll-timeout`, `--namespace`,
`--skip-capacity-probe`, and `--evidence`.

For a `DEBUG_DEV_*` version, copy that exact local build's `.js` and `.wasm`
files into `.webassembly/` below the runner's current directory. The runner
fails before any Controller write when either file is absent; this prevents the
JS loader from silently using an older universal WASM without the Player APIs.

The runner derives fresh unsigned-48 revisions above every observed namespace
version. It first writes slot A SPTs with exact readback, then writes the A-only
SPM last. It removes copy-only comment lines and indentation, matching Studio's
Project preprocessing, uploads the Berry as `BERRY(...)` through `writeTngl`,
then resumes automatically in a fresh Node/WASM process after the expected
Controller serial restart. The resumed phase physically reads the TNGL bytecode
into a fresh WASM runtime and requires its fingerprint to equal the pre-restart
compiler fingerprint. It then checks global ID255 and local ID1 values plus
identical causal clocks across pause, external-authority, play, seek, rewind,
and a running-rewind loop. It then writes slot B
SPTs, proves that inactive files did not alter playback, writes the new SPM
last, verifies the preferred switch without a mixed snapshot, and repeats the
transport checks.

By default the same isolated Controller also gets a deterministic 60,000-byte
NetworkStorage transport/readback probe. The deploy gate accepts 60,000 and
rejects 60,001 before the write function can run. Use
`--skip-capacity-probe` when flash headroom has already been measured elsewhere.
After the playback checks, the runner retires the probe with a higher-version
zero-byte marker so that its payload does not remain on flash.
The runner prints and optionally saves revisions, exact sizes, fingerprints,
the final namespace listing, firmware version, serial port, monorepo head, and
all observed causal clocks. It leaves the example Project Berry and named
NetworkStorage files installed; restore the intended Project after testing.

## Host Berry regression

From the Examples repository root, run the deterministic lifecycle/failure-path
test with the Berry host interpreter built by the matching firmware checkout:

```bash
/path/to/firmware/components/spectoda-scripting/berry/berry \
  tests/player-bundle-stub.be
```

The test reads this example's fixture corpus and covers preferred/fallback
selection, bounded range reads, transient metadata and timeline-anchor failures,
pause/resume clocks, seek/loop reconstruction, and local-ID validation without
writing to a Controller.
