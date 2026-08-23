These tables are generated from the parser contract. `additionalProperties: false` marks typos and firmware-ignored fields as warnings; only invalid JSON or a non-object top-level value blocks a write.

## Top-level

`controller`, `wifi`, `rtc`, `pwm`, `ports`, `io`, `segments`, `canvases`, `temperature`, `script`, `scripts`, `plugins`, `sensors`, `ble`, `console`, `serial`, `espnow`, `ethernet`

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
| `_btn` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `led` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `!led+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `_led` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `button` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |

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

## `canvases`

:::note[Reserved for future firmware]
Reserved forward-compatible canvas map. Each canvas label lists segment labels. Firmware 0.12.11 preserves but does not act on this section.
:::

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `<LABEL>` | `array<string /^[A-Za-z0-9_]{1,5}$/>` | reserved |

## `temperature`

:::note[Reserved for future firmware]
Reserved forward-compatible Controller temperature sensor configuration. Firmware 0.12.11 preserves but does not act on it; a future firmware can publish temperature warnings through Controller notifications without rewriting the config.
:::

| Keyword | Type / allowed values | Status |
| --- | --- | --- |
| `type` | `"NTC"` | reserved |
| `pin` | `-1 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | reserved |
| `resistance` | `integer [1..∞]` | reserved |

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
| `_en` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `btn` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `!btn+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `_btn` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `pin` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `!pin+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `_pin` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `button` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |

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
| `_en` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33` | supported |
| `btn` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `!btn+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `_btn` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `pin` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `!pin+` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |
| `_pin` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | supported |
| `button` | `-1 \| 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 \| 11 \| 12 \| 13 \| 14 \| 15 \| 16 \| 17 \| 18 \| 19 \| 20 \| 21 \| 22 \| 23 \| 25 \| 26 \| 27 \| 32 \| 33 \| 34 \| 35 \| 36 \| 37 \| 38 \| 39` | deprecated |

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

## Common warnings and guidance

- `io.*.fade` — Use `fadetime`; `fade` is not a firmware 0.12.11 keyword.
- `segments.*.brightness` — Segment brightness is not supported. Set `brightness` on the referenced `io.<label>` object instead.
- `controller.!button` — Decorated `button` is invalid. Use `!btn`; only bare `button` remains as a deprecated alias.
- `controller.button!` — Decorated `button` is invalid. Use `btn!`; only bare `button` remains as a deprecated alias.
- `controller.!button+` — Decorated `button` is invalid. Use `!btn+`; only bare `button` remains as a deprecated alias.
- `controller.button-` — Decorated `button` is invalid. Use `btn-`; only bare `button` remains as a deprecated alias.
- `controller._button` — Decorated `button` is invalid. Use `_btn`; only bare `button` remains as a deprecated alias.
- `plugins.*.!button` — Decorated `button` is invalid. Use `!btn`; only bare `button` remains as a deprecated alias.
- `plugins.*.button!` — Decorated `button` is invalid. Use `btn!`; only bare `button` remains as a deprecated alias.
- `plugins.*.!button+` — Decorated `button` is invalid. Use `!btn+`; only bare `button` remains as a deprecated alias.
- `plugins.*.button-` — Decorated `button` is invalid. Use `btn-`; only bare `button` remains as a deprecated alias.
- `plugins.*._button` — Decorated `button` is invalid. Use `_btn`; only bare `button` remains as a deprecated alias.
- `sensors.*.!button` — Decorated `button` is invalid. Use `!btn`; only bare `button` remains as a deprecated alias.
- `sensors.*.button!` — Decorated `button` is invalid. Use `btn!`; only bare `button` remains as a deprecated alias.
- `sensors.*.!button+` — Decorated `button` is invalid. Use `!btn+`; only bare `button` remains as a deprecated alias.
- `sensors.*.button-` — Decorated `button` is invalid. Use `btn-`; only bare `button` remains as a deprecated alias.
- `sensors.*._button` — Decorated `button` is invalid. Use `_btn`; only bare `button` remains as a deprecated alias.

## Cross-section rules

- I/O and segment labels contain 1..5 characters from A-Z, a-z, 0-9 or underscore.
- A longer segment-map key is truncated to its first five characters by firmware. Studio warns but keeps the config writable so multiple definitions can intentionally share one five-character segment identifier.
- Only one I2C I/O entry can be active.
- DALI maxcolortemp must be greater than or equal to mincolortemp.
- The I/O referenced by this segment is not defined in this Controller config.
- Segment size is shorthand for from=1,to=size.
- Segment brightness is unsupported; brightness belongs on the referenced I/O object.
- Pin value -1 means not connected for every GPIO pin schema.
- A leading underscore disables a decorated GPIO member while preserving its pin and electrical decorators in JSON. It must be the first character; use type NC to disable a complete I/O because an underscore in an I/O label is an ordinary label character.
- DAC order W requires exactly one GPIO 25/26 or -1; RB or an omitted order requires two values from -1, 25 and 26, and connected GPIOs must be unique.
- ADC inputs are limited to ADC1 GPIOs 32..39 or -1; RTC I2C pins must be output-capable or -1.
- controller.btn wins over deprecated bare controller.button when both are present. Decorated button aliases are invalid for authoring and must use the btn base; firmware 0.12.11 still tolerates deployed occurrences with a warning.
- A disabled controller._btn member does not override a separate deprecated controller.button member; remove or rename the legacy member when disabling the button.
- plugins PowerManage btn wins over deprecated bare button and pin aliases. Decorated button aliases are invalid for authoring and must use the btn base; firmware 0.12.11 still tolerates deployed occurrences with a warning.

_Generated from the versioned `Spectoda/firmware` contract for FW 0.12.11. Do not maintain these tables separately from the firmware contract._
