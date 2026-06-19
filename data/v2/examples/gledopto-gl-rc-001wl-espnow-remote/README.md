# GLEDOPTO GL-RC-001WL ESP-NOW Remote

This example shows how to map raw ESP-NOW packets from a GLEDOPTO
GL-RC-001WL / WLED-style remote to Spectoda EventStates through Berry
`espnow.rx(filter, callback)`.

Use this pattern instead of the legacy `ESPNOWRADIO` IO when the controller
must keep normal Controller-to-Controller ESP-NOW communication enabled.

## Files

- `gledopto-single-id.be` - compact Berry plugin for one Spectoda ID with
  `toggl` and `brigh`.
- `gledopto-direct-indirect.be` - compact Berry plugin for a two-zone
  direct/indirect light setup with `toggl`, `brigh`, and `tempe`.
- `gledopto-two-id-select.be` - compact Berry plugin where S1/S2/S3/S4 select
  whether brightness buttons control ID1, ID101, or both.
- `upload-two-id-select.be` - standalone raw Controller Berry script for the
  S1/S2/S3/S4 two-ID selection variant. Paste this file directly into the
  Controller Berry script editor.
- `usage-single-id.tngl` - minimal TNGL call for one ID.
- `usage-direct-indirect.tngl` - minimal TNGL call for two IDs.
- `usage-two-id-select.tngl` - minimal TNGL call for the S1/S2/S3/S4 selection
  variant.

## Firmware Assumptions

The controller firmware must expose the native Berry ESP-NOW API:

```berry
import espnow
var off = espnow.rx(filter, callback)
```

The examples expect firmware 0.12.11 or newer builds that include the raw
`espnow.rx(filter, callback)` implementation.

Do not disable the normal ESP-NOW connector for this use case. `espnow.rx`
receives raw non-mesh packets before Berry runs, while regular Spectoda Mesh
ESP-NOW remains available for controller communication.

## Remote Packet Filter

Both plugins use the same native receive filter:

```berry
{
    "size": 13,
    "magic": [129, 145]
}
```

Meaning:

- `size: 13` accepts only the observed GLEDOPTO remote payload length.
- `magic: [129, 145]` accepts only packets whose first byte is `0x81` or
  `0x91`.
- `mac` can be added to lock the script to one physical remote.

The remote sends the same button press on multiple Wi-Fi channels. The plugin
deduplicates packets by the sequence stored in payload bytes `1..4`.

## Single-ID Variant

Use `GledoptoRemoteSingle(S)` when one remote controls one Spectoda ID.

Copy `gledopto-single-id.be` into the controller Berry script, then call:

```berry
GledoptoRemoteSingle({
    "id": ID1,
    "mac": "AA:BB:CC:DD:EE:FF",
    "brigh": 50,
    "brighStep": 10
})
```

`mac` is optional. When it is present, `macFilter` defaults to `true` and only
packets from that remote are accepted. Replace the placeholder MAC with the
remote printed by a debug/smoke script, or remove the field while discovering
the remote.

Set `"debug": true` while discovering the remote MAC. The single-ID plugin keeps
the serial `print()` output and also writes the last accepted sender MAC into
three Studio-visible LABEL EventStates on the target ID:

| Label | Example value |
|---|---|
| `mac1` | `AABB` |
| `mac2` | `CCDD` |
| `mac3` | `EEFF` |

Read them as `AA:BB:CC:DD:EE:FF`. The value is split because Spectoda LABEL
values are short `label_t` identifiers, not arbitrary long strings.

Button behavior:

- ON writes `EVS("toggl", id)` to `100%`.
- OFF writes `EVS("toggl", id)` to `0%`.
- Brightness +/- writes `EVS("brigh", id)` and keeps `toggl` in sync with the
  resulting brightness; when `brigh` reaches `0%`, `toggl` is also set to
  `0%`.
- Preset 1 and preset 2 both toggle the same ID.
- Night, warmer, and colder are ignored unless `debug` is enabled.

## Direct/Indirect Variant

Use `GledoptoRemote(S)` when one remote controls two logical light zones.

Copy `gledopto-direct-indirect.be` into the controller Berry script, then call:

```berry
GledoptoRemote({
    "direct": ID1,
    "indirect": ID2,
    "mac": "AA:BB:CC:DD:EE:FF",
    "brigh": 50,
    "brighStep": 10,
    "tempeStep": 10
})
```

Button behavior:

- ON/OFF writes `toggl` for both IDs.
- Brightness +/- writes `brigh` for both IDs and keeps both `toggl` states in
  sync with the resulting brightness; when shared `brigh` reaches `0%`, both
  `toggl` states are also set to `0%`.
- Night turns direct off, indirect on, and sets both `tempe` values warm.
- Preset 1 toggles indirect.
- Preset 2 toggles direct.
- Preset 3/4 moves `tempe` warmer/colder for both IDs.

## Two-ID Selection Variant

Use `GledoptoRemoteTwoIdSelect(S)` when S1/S2/S3/S4 should select which IDs
the brightness buttons control.

For direct upload into the Controller Berry script editor, use
`upload-two-id-select.be`. Do not paste `usage-two-id-select.tngl` into the raw
Berry editor; that file is a TNGL snippet and contains `BERRY(...)` plus `//`
comments, which are not raw Berry syntax.

Copy `gledopto-two-id-select.be` into the controller Berry script, then call:

```berry
GledoptoRemoteTwoIdSelect({
    "id1": ID1,
    "id2": ID101,
    # "mac": "AA:BB:CC:DD:EE:FF",
    "debug": true,
    "brigh": 50,
    "brighStep": 10,
    "brighMin": 0,
    "brighMax": 100
})
```

Leave `mac` commented out while discovering the remote. Otherwise a placeholder
MAC filter can reject every real packet before the script emits any EventState.

Button behavior:

- Any accepted button press writes `EVS("D_ena", ID1)` and
  `EVS("D_ena", ID101)` to `0%`.
- With `"debug": true`, any accepted packet also writes the sender MAC to
  `mac1`/`mac2`/`mac3` LABEL EventStates on both ID1 and ID101.
- S1 selects ID1 for brightness +/-.
- S2 selects ID101 for brightness +/-.
- S3 and S4 select both ID1 and ID101 for brightness +/-.
- Brightness +/- writes `brigh` only for the selected ID group and writes
  `toggl` to `100%` for the same selected IDs.
- ON ignores the selected S group and writes `brighMax` to ID1 and ID101.
- OFF ignores the selected S group and writes `brighMin` to ID1 and ID101.
- Moon intentionally does nothing beyond the shared `D_ena` disable event.

## Config Map Reference

Single-ID `S` map:

| Key | Default | Meaning |
|---|---:|---|
| `id` | `1` | Spectoda ID controlled by the remote |
| `mac` | `""` | optional remote MAC address |
| `macFilter` | real `mac` set | whether to reject packets from other MACs |
| `debug` | `false` | print accepted packets; single-ID also emits `mac1`/`mac2`/`mac3` |
| `brigh` | `50` | initial local brightness cache |
| `brighStep` | `10` | brightness change per button press |

Direct/indirect `S` map:

| Key | Default | Meaning |
|---|---:|---|
| `direct` | `1` | Spectoda ID for the direct zone |
| `indirect` | `2` | Spectoda ID for the indirect zone |
| `mac` | `""` | optional remote MAC address |
| `macFilter` | real `mac` set | whether to reject packets from other MACs |
| `debug` | `false` | print accepted packets and ignored buttons |
| `brigh` | `50` | initial shared brightness cache |
| `brighStep` | `10` | brightness change per button press |
| `tempeStep` | `10` | temperature change per button press |

Two-ID selection `S` map:

| Key | Default | Meaning |
|---|---:|---|
| `id1` | `1` | first Spectoda ID controlled by S1 |
| `id2` | `101` | second Spectoda ID controlled by S2 |
| `group` | `3` | initial selected group: `1` id1, `2` id2, `3` both |
| `mac` | `""` | optional remote MAC address |
| `macFilter` | `mac != ""` | whether to reject packets from other MACs |
| `debug` | `false` | print accepted packets and emit `mac1`/`mac2`/`mac3` on both IDs |
| `brigh` | `50` | initial brightness cache for both IDs |
| `brigh1` | `brigh` | optional initial brightness cache for id1 |
| `brigh2` | `brigh` | optional initial brightness cache for id2 |
| `brighStep` | `10` | brightness change per button press |
| `brighMin` | `0` | brightness written to both IDs by OFF |
| `brighMax` | `100` | brightness written to both IDs by ON |

## Smoke Test

1. Upload the plugin and one usage call as a TNGL/Berry script to a controller
   with ESP-NOW enabled.
2. Remove `"mac"` and set `"debug": true` while discovering the remote MAC.
3. Press ON, OFF, brightness +, and brightness -.
4. Watch the controller log, or in Studio read `mac1`/`mac2`/`mac3` on the
   target ID and combine them into the full MAC address.

After the remote MAC is known, set `"mac"` and leave `"debug": false` for the
installation script.
