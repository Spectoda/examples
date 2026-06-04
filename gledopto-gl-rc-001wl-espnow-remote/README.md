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
- `usage-single-id.tngl` - minimal TNGL call for one ID.
- `usage-direct-indirect.tngl` - minimal TNGL call for two IDs.

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

## Config Map Reference

Single-ID `S` map:

| Key | Default | Meaning |
|---|---:|---|
| `id` | `1` | Spectoda ID controlled by the remote |
| `mac` | `""` | optional remote MAC address |
| `macFilter` | `mac != ""` | whether to reject packets from other MACs |
| `debug` | `false` | print accepted packets and ignored buttons |
| `brigh` | `50` | initial local brightness cache |
| `brighStep` | `10` | brightness change per button press |

Direct/indirect `S` map:

| Key | Default | Meaning |
|---|---:|---|
| `direct` | `1` | Spectoda ID for the direct zone |
| `indirect` | `2` | Spectoda ID for the indirect zone |
| `mac` | `""` | optional remote MAC address |
| `macFilter` | `mac != ""` | whether to reject packets from other MACs |
| `debug` | `false` | print accepted packets and ignored buttons |
| `brigh` | `50` | initial shared brightness cache |
| `brighStep` | `10` | brightness change per button press |
| `tempeStep` | `10` | temperature change per button press |

## Smoke Test

1. Upload the plugin and one usage call as a TNGL/Berry script to a controller
   with ESP-NOW enabled.
2. Set `"debug": true` while discovering the remote MAC.
3. Press ON, OFF, brightness +, and brightness -.
4. Watch the controller log or Spectoda App EventStates for `toggl` and
   `brigh` changes.

After the remote MAC is known, set `"mac"` and leave `"debug": false` for the
installation script.
