These tables are generated from the parser contract. Studio uses `additionalProperties: false` to prevent writes containing typos or firmware-ignored fields.

## Top-level

`controller`, `wifi`, `rtc`, `pwm`, `ports`, `io`, `segments`, `script`, `scripts`, `plugins`, `sensors`, `ble`, `console`, `serial`, `espnow`, `ethernet`

## `controller`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `name` | `string /^[A-Za-z0-9_]{1,5}$/` | supported |
| `brightness` | `integer [0..255]` | supported |
| `power` | `integer [0..255]` | supported |
| `fps` | `integer [0..100]` | supported |
| `ups` | `integer [10..100]` | supported |
| `updateable` | `boolean` | supported |
| `autosave` | `boolean or integer [1000..∞]` | supported |
| `debug` | `boolean or integer [0..5]` | supported |
| `wifi` | `boolean` | supported |
| `websocket` | `boolean` | supported |
| `btn` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `!btn+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `button` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `!button+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `led` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `!led+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |

## `wifi`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `channel` | `integer [1..13]` | supported |

## `rtc`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `type` | `"SYSTEM" \| "DS1307" \| "PCF8563"` | supported |
| `sda` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `scl` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |

## `pwm`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `frequency` | `integer [1..∞]` | supported |

## `ports`

:::caution[Deprecated]
This top-level section is retained for backward compatibility only. It is scheduled for removal in firmware 0.13.
:::

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `tag` | `string /^[A-Za-z0-9_]?$/` | supported |
| `type` | `"WS2805" \| "WS2811" \| "WS2812" \| "WS2812B" \| "WS2812D" \| "WS2813" \| "WS2814" \| "WS2815" \| "SK6812" \| "GS8208" \| "APA106"` | supported |
| `pin` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `tx` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `txinverted` | `boolean` | supported |
| `rx` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `rxinverted` | `boolean` | supported |
| `mapping` | `array<integer>` | supported |
| `order` | `string (one or two 1–4 character RGBW orders separated by a vertical bar)` | supported |
| `variant` | `string` | supported |
| `t1` | `integer [0..∞]` | supported |
| `t2` | `integer [0..∞]` | supported |
| `t3` | `integer [0..∞]` | supported |
| `size` | `integer [1..2048]` | supported |
| `reversed` | `boolean` | supported |

## `io`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `<LABEL>` | `string /^[A-Za-z0-9_]{1,5}$/` | supported |
| `type` | `string` | supported |
| `tag` | `string /^(?:$\|[A-Za-z0-9_].*)$/` | supported |
| `label` | `string /^[A-Za-z0-9_]{1,5}$/` | supported |
| `name` | `string` | supported |

## `segments`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `id` | `integer [0..255]` | supported |
| `io` | `string /^[A-Za-z0-9_]{1,5}$/` | supported |
| `size` | `integer [1..2048]` | supported |
| `from` | `integer [1..2048]` | supported |
| `to` | `integer [1..2048]` | supported |
| `step` | `integer [1..2048]` | supported |

## `script`

This section is a scalar value or collection; see the JSON Schema for its exact shape.

## `scripts`

This section is a scalar value or collection; see the JSON Schema for its exact shape.

## `plugins`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `type` | `"PowerManage"` | supported |
| `holdtime` | `integer [1..65535]` | supported |
| `alive` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | deprecated |
| `en` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `!en+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `btn` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `!btn+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `button` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `!button+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `pin` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `!pin+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |

## `sensors`

:::caution[Deprecated]
This top-level section is retained for backward compatibility only. It is scheduled for removal in firmware 0.13.
:::

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `type` | `"PowerManage"` | supported |
| `holdtime` | `integer [1..65535]` | supported |
| `alive` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | deprecated |
| `en` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `!en+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `btn` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `!btn+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `button` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `!button+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `pin` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `!pin+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |

## `ble`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `power` | `integer [-128..127]` | supported |
| `disable` | `boolean` | supported |
| `enable` | `boolean` | supported |
| `advertise` | `boolean` | supported |
| `timeout` | `integer [0..∞]` | supported |

## `console`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `debug` | `boolean or integer [0..5]` | supported |
| `tx` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `rx` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `baudrate` | `integer [1..5000000]` | supported |

## `serial`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `baudrate` | `integer [1..5000000]` | supported |
| `debug` | `boolean` | supported |
| `tx` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `rx` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `enable` | `boolean` | supported |

## `espnow`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `datarate` | `"250K" \| "500K" \| "1M" \| "2M" \| "2M_S" \| "11M" \| "11M_S" \| "48M" \| "24M" \| "12M" \| "6M" \| "54M" \| "36M" \| "18M" \| "9M"` | supported |
| `channel` | `integer [1..11]` | supported |
| `power` | `integer [-128..127]` | supported |
| `repetitions` | `integer [1..24]` | supported |
| `floor` | `integer [-128..127]` | supported |
| `treshold` | `integer [-128..127]` | supported |
| `rebroadcasts` | `integer [0..24]` | supported |
| `disable` | `boolean` | supported |
| `enable` | `boolean` | supported |
| `isolate` | `boolean` | supported |
| `timeout` | `integer [0..∞]` | supported |
| `advertise` | `boolean` | supported |

## `ethernet`

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `variant` | `"LAN8720" \| "OLIMEXPOE2" \| "OLIMEXPOE"` | supported |
| `type` | `"IP101" \| "RTL8201" \| "LAN8720" \| "DP83848" \| "KSZ8041" \| "KSZ8081"` | supported |
| `ip` | `string /^(?:25[0-5]\|2[0-4][0-9]\|1?[0-9]?[0-9])(?:\.(?:25[0-5]\|2[0-4][0-9]\|1?[0-9]?[0-9])){3}$/` | supported |
| `gateway` | `string /^(?:25[0-5]\|2[0-4][0-9]\|1?[0-9]?[0-9])(?:\.(?:25[0-5]\|2[0-4][0-9]\|1?[0-9]?[0-9])){3}$/` | supported |
| `mask` | `string /^(?:25[0-5]\|2[0-4][0-9]\|1?[0-9]?[0-9])(?:\.(?:25[0-5]\|2[0-4][0-9]\|1?[0-9]?[0-9])){3}$/` | supported |
| `dns` | `string /^(?:25[0-5]\|2[0-4][0-9]\|1?[0-9]?[0-9])(?:\.(?:25[0-5]\|2[0-4][0-9]\|1?[0-9]?[0-9])){3}$/` | supported |
| `hostname` | `string` | supported |
| `phydet` | `integer` | supported |
| `phymdc` | `integer` | supported |
| `phymdio` | `integer` | supported |
| `phyen` | `integer` | supported |
| `phyrst` | `integer` | supported |
| `rmiipin` | `integer` | supported |
| `rmiimode` | `integer` | supported |
| `timeout` | `integer` | supported |
| `enable` | `boolean` | supported |

## Cross-section rules

- I/O and segment labels contain 1..5 characters from A-Z, a-z, 0-9 or underscore.
- Only one I2C I/O entry can be active.
- DALI maxcolortemp must be greater than or equal to mincolortemp.
- A segment section must refer to an existing I/O label.
- Segment size is shorthand for from=1,to=size.
- Pin value -1 means not connected for every GPIO pin schema.
- DAC order W requires exactly one GPIO 25/26 or -1; RB or an omitted order requires two values from -1, 25 and 26, and connected GPIOs must be unique.
- ADC inputs are limited to ADC1 GPIOs 32..39 or -1; RTC I2C pins must be output-capable or -1.
- controller.btn wins over deprecated controller.button when both are present.
- plugins PowerManage btn wins over deprecated button and pin aliases.

_Generated from the versioned `Spectoda/firmware` contract for FW 0.12.11. Do not maintain these tables separately from the firmware contract._
