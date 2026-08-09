#### DALI IO - JSON settings (Controller config)

This page describes all JSON fields supported by DALI IO in Controller configuration.

**Where the settings are defined**

* Add a `DALI` item to the `io` section of the controller config. Example with the `DALI` label (max. 5 characters):

```json
{
  "controller": {
    "name": "SC_00",
    "led": 19,
    "!button": 22
  },
  "io": {
    "DALI": {
      "type": "DALI",
      "variant": "DT6",
      "order": "W",
      "tx": 23,
      "!rx": 18
    }
  },
  "segments": {
    "DIMMA": {
      "io": "DALI"
    }
  }
}
```

**Required / common fields**

* **type**: must be `"DALI"`.
* **tx / pins**:
  * `"tx"` defines the DALI TX GPIO, for example 23. Alternatively, `"pins": [..]` can be used together with `order` to map pins to channels. For DALI, TX is the primary pin.
  * Optional `en` pin can be used as enable.
  * Pin modifiers: `!` inversion, `+` pull-up, `-` pull-down. For example, `"!rx": 18` means RX on GPIO 18 with inverted logic.
* **rx** (optional):
  * `"rx"` (or `"!rx"` for inversion) for receiving/monitoring, commissioning or diagnostics.
* **order**:
  * Defines channel layout and is parsed by `utils::stringToPixelOrder()`.
    * `W` (one DALI channel per pixel)
    * `WW` (two DALI channels per pixel)
    * `RGB` (three DALI channels per pixel)
    * `RGBW` (four DALI channels per pixel)
  * If not provided, the default is `W`.

**DALI-specific fields**

* **variant**:
  * Device modes: `"DT6"`, `"DT8_XY"`, `"DT8_RGBWAF"`, `"DT8_TC"`.
  * Service modes: `"MONITOR"`, `"COMMISSION"`, `"DECOMMISSION"` (run at boot for diagnostics/addressing).
  * Note: `DT6_ONOFF` is reserved and not implemented.
  * If not provided, the default is `DT6`.
* **mapping** (array of numbers):
  * Maps channels to DALI short addresses (0-63); the meaning depends on `order`:
    * `W`: one value per pixel.
    * `WW`: two values per pixel, for example warm -> first and cool -> second.
    * `RGBW`: four values per pixel (R, G, B, W).
  * A negative number repeats the previous value `abs(n)` times, for example `[5,-3] -> [5,5,5,5]`.
  * The length must be divisible by the channel count defined by `order`.
  * Use short addresses starting from 0 upwards; gaps are allowed. The order in the array follows the pixel/channel layout and does not need to be numerically sorted.
  * If `mapping` is missing, the port sends broadcast commands according to the first pixel rendered to this IO.
* **poweronlevel**: 0-254. Power-on level. Values above 254 are clipped to 254 (255 = MASK/keep).
  * Note: `poweronlevel: 0` together with `systemfailurelevel: 0` is suitable for phase-controlled lights that tend to flash during mains power on/off.
* **systemfailurelevel**: 0-254. Level during a system failure. Values above 254 are clipped to 254.
  * See the note above. Setting `0` helps eliminate unwanted flashing during power changes.
* **minlevel**, **maxlevel**: 0-254. Level limits applied during startup (clipped to 254).
* **faderate**: step rate per second, mapped to a DALI index (0-15) according to the table.
* **fadetime**: time in ms, mapped to a DALI index (0-15) according to the table.
* **mincolortemp**, **maxcolortemp** (`DT8_TC`): Kelvin, range 1000-10000 K; `maxcolortemp >= mincolortemp`.

**Behaviour notes**

* DT6 (classic short-address control): `mapping` defines which short address the channel controls. If all channels are the same, firmware optimizes sending by using broadcast.
* DT8 modes (`DT8_RGBWAF`, `DT8_TC`): use DT8 commands without `mapping` to addresses. The first pixel is converted into DT8 commands and currently sent as broadcast.

**Examples**

DT6 - `W` (inverted RX, ascending addresses):

```json
{
  "controller": {
    "name": "SC_00",
    "led": 19,
    "!button": 22
  },
  "temperature": {
    "type": "NTC",
    "pin": 35,
    "resistance": 47000
  },
  "io": {
    "DALI": {
      "type": "DALI",
      "variant": "DT6",
      "mapping": [0, 6, 1, 4, 2, 3, 5],
      "order": "W",
      "tx": 23,
      "!rx": 18,
      "fadetime": 700,
      "faderate": 358,
      "poweronlevel": 0,
      "systemfailurelevel": 254,
      "minlevel": 0,
      "maxlevel": 254
    }
  },
  "segments": {
    "DIMMA": {
      "io": "DALI",
      "size": 7
    }
  }
}
```

DT6 - `RGBW`:

```json
{
  "controller": {
    "name": "SC_00",
    "led": 19,
    "!button": 22
  },
  "io": {
    "DALI": {
      "type": "DALI",
      "variant": "DT6",
      "order": "RGBW",
      "tx": 23,
      "!rx": 18,
      "mapping": [0, 1, 2, 3, 4, 5, 6, 7],
      "fadetime": 700,
      "faderate": 358
    }
  }
}
```

DT6 - `WW`:

```json
{
  "controller": {
    "name": "SC_00",
    "led": 19,
    "!button": 22
  },
  "io": {
    "DALI": {
      "type": "DALI",
      "variant": "DT6",
      "order": "WW",
      "tx": 23,
      "!rx": 18,
      "mapping": [0, 1, 2, 3, 4, 5],
      "fadetime": 700,
      "faderate": 358
    }
  }
}
```

DT8 Tunable White (broadcast) with temperature range:

```json
{
  "controller": {
    "name": "SC_00",
    "led": 19,
    "!button": 22
  },
  "io": {
    "DALI": {
      "type": "DALI",
      "variant": "DT8_TC",
      "tx": 23,
      "!rx": 18,
      "mincolortemp": 2700,
      "maxcolortemp": 6500,
      "fadetime": 700,
      "faderate": 358
    }
  }
}
```

Commissioning (runs commissioning at boot):

```json
{
  "controller": {
    "name": "SC_00",
    "led": 19,
    "!button": 22
  },
  "io": {
    "DALI": {
      "type": "DALI",
      "variant": "COMMISSION",
      "tx": 23,
      "!rx": 18
    }
  }
}
```

**Limits**

* DALI port: up to 24 logical pixels.
* Levels are clipped to 254 (255 = "keep current" in DALI).
* IO label length: max. 5 characters.
