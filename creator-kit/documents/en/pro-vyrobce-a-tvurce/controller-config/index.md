Controller config is the JSON document loaded by firmware when a Controller
starts. This section joins the previously separate guides into one
version-matched map.

:::caution[Config is versioned]
Use the reference matching the WASM/firmware version selected for the Network.
Studio loads the schema from the active WASM. If the contract is missing or
unsupported, config writes are blocked while reading and exporting remain
available.
:::

## Complete reference

- [Every top-level section and keyword in FW 0.12.11](./fw-01211-keywords/)
- [Every available I/O type, variant and field](./fw-01211-io-types/)
- [WASM schema, Studio validation and autocomplete](./wasm-schema/)
- [Detailed Ethernet example](./ethernet/)
- [Detailed DALI example](./io-type-dali/)

## Recommended shape

```json
{
  "controller": {
    "name": "MAIN",
    "brightness": 255,
    "power": 180,
    "fps": 60,
    "ups": 60,
    "!btn+": 0,
    "led": 2
  },
  "wifi": { "channel": 1 },
  "io": {
    "PIXEL": {
      "type": "NEOPIXEL",
      "variant": "WS2812B",
      "order": "GRB",
      "pin": 16,
      "brightness": 255,
      "power": 120
    },
    "INPUT": {
      "type": "GPI",
      "variant": "BUTTON",
      "!pin+": 17,
      "debounce": 50
    }
  },
  "segments": {
    "MAIN": { "io": "PIXEL", "size": 120 }
  },
  "plugins": [
    {
      "type": "PowerManage",
      "en": 25,
      "!btn+": 26,
      "holdtime": 1000
    }
  ]
}
```

Prefer the object-map form of `io`, where each key is a 1–5 character label.
Firmware 0.12.11 still reads legacy `ports`, array-form `io` and `sensors`, but
new configs should not be based on them. `ports` and `sensors` are scheduled
for removal in firmware 0.13.

## GPIO decorators

GPIO keywords may use `!` (invert), `+` (internal pull-up) and `-` (internal
pull-down). The parser removes decorators at any position, so `!pin+`, `p!i+n`
and `-pin!` all resolve to `pin`. Use a conventional form such as `!pin+` for
readability.

## What is not Controller config

Network fields `signature` and `key` are not Controller config. JSON inputs to
the WASM connection parser are also separate. Studio therefore rejects them as
unknown keywords in the Controller Config Editor.

_Generated from the versioned `Spectoda/firmware` contract for FW 0.12.11. Do not maintain these tables separately from the firmware contract._
