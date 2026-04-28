# Analog Potentiometers To DALI Red/White EventStates

This example maps two 0-3.3 V potentiometers on one Spectoda controller to two
percentage EventStates:

- `IO32` -> `EVS("white", room_id)`
- `IO33` -> `EVS("red", room_id)`

The use case is a two-room installation where each room has its own controller,
and each controller has two local potentiometers:

- one potentiometer controls the white DALI channel
- one potentiometer controls the red DALI channel
- EventState IDs keep the two rooms independent

The complete final project pattern is available in `final-project.tngl`.

## Files

- `analog-pot-event.be` - reusable Berry helper.
- `usage-z19.be` - usage snippet for room/controller `Z19`.
- `usage-z22.be` - usage snippet for room/controller `Z22`.
- `controller-config-z19.json` - controller config example with `IO32` and
  `IO33` configured as ADC inputs.
- `final-project.tngl` - complete final TNGL pattern with both controllers,
  both EventStates, DALI segments, and brightness layers.

## Physical Wiring Through The ABCDE Terminal

This example assumes the SC Industry extension terminal is wired as:

| Terminal | Signal | Use in this example |
| --- | --- | --- |
| `A` | `3V3` | Potentiometer high/reference side |
| `B` | `IO33` / ADC | Red potentiometer wiper |
| `C` | `IO32` / ADC | White potentiometer wiper |
| `D` | `GND` | Potentiometer low/reference side |
| `E` | `NC` / spare | Not used |

Use linear potentiometers, typically `10 kOhm`. Each potentiometer is wired as
a simple voltage divider between `A` and `D`, with the middle wiper connected
to the selected ADC input.

```text
ABCDE terminal

A  3V3  ----+---- white pot outer leg
            +---- red pot outer leg

B  IO33 -------- red pot wiper      -> EVS("red", room_id)
C  IO32 -------- white pot wiper    -> EVS("white", room_id)

D  GND  ----+---- white pot other outer leg
            +---- red pot other outer leg

E  NC   ---- not connected
```

If the physical knob direction is inverted, swap the two outer legs of that
potentiometer on `A` and `D`. Keep the wiper on `B` or `C`.

Keep the voltage on `IO32` and `IO33` within `0..3.3 V`. Do not connect DALI,
mains, 5 V, 10 V, or any external supply voltage to these ADC inputs.

The DALI drivers stay on the controller DALI output. In the project pattern
shown here, DALI addresses `1..2` are the white segment and addresses `3..4`
are the red segment.

## DALI Driver Dimming Curve

In the tested installation, the DALI drivers were configured for linear
dimming. Keep the project animation blocks linear as well:

- create `white` and `red` variables from the `EVS("white", room_id)` and
  `EVS("red", room_id)` EventStates
- apply each variable directly as the `BRIGHTNESS` modifier for the matching
  segment
- keep the `LOGARITHMIC CORRECTION` blocks disabled

Do not apply a second logarithmic correction in the project when the DALI
drivers already provide the intended dimming curve. Otherwise the potentiometer
will no longer map cleanly to the real driver output.

Enable logarithmic correction only when the connected drivers are configured
linearly but the installation needs a perceptual brightness curve in the
Spectoda project layer.

The final TNGL uses direct brightness modifiers:

```tngl
var white = genLastEventParam($white);
var red = genLastEventParam($red);

siftSegments({ segment($WHITE); }, {
  addLayer(0s, Infinity, {
    addDrawing(0s, Infinity, animFill(Infinity, #ffffff));
  }).modifyBrightness(&white);
});

siftSegments({ segment($RED); }, {
  addLayer(0s, Infinity, {
    addDrawing(0s, Infinity, animFill(Infinity, #ffffff));
  }).modifyBrightness(&red);
});
```

## Important Controller Config Detail

For 0-3.3 V analog input, configure the pins as `ADC`:

```json
"IO32": {
  "type": "ADC",
  "pin": 32
},
"IO33": {
  "type": "ADC",
  "pin": 33
}
```

Do not use `type: "GPI"` with `variant: "ANALOG"` for this setup. In the
current firmware parser, that path does not provide analog ADC readings.

## Berry Usage Pattern

The helper follows the Spectoda example convention where `in` is the input IO
object and `evs` is the target EventState object:

```berry
AnalogPotEvent({
    "in": io["IO33"],
    "evs": EVS("red", ID_MISTNOST_Z22),
    "deadband": 0.5
})
```

The helper reads ADC mode `1`, which is raw ESP32 ADC with 11 dB attenuation
for approximately 0-3.3 V signals. It maps the raw 0-4095 range to a
percentage EventState value from 0 to 100.

`deadband` is a hysteresis value in percentage points around the rounding
boundary. The default is `0.5`, which prevents ADC noise near a boundary from
spamming values such as `10, 11, 10, 11`, while still allowing every integer
percentage from `0` to `100` when the knob is actually moved. Lower it for more
sensitive controls when the hardware signal is quiet, or increase it if the
potentiometer cable run is noisy.

The final TNGL relies on this default, so the `AnalogPotEvent(...)` calls do
not need to repeat `"deadband": 0.5` unless the installation needs a different
hysteresis.

## Z19 Example

Define the room ID in the controller/TNGL context:

```text
#define ID_MISTNOST_Z19 ID19
```

Then use this Berry snippet after `analog-pot-event.be`:

```berry
AnalogPotEvent({
    "in": io["IO32"],
    "evs": EVS("white", ID_MISTNOST_Z19),
    "deadband": 0.5
})

AnalogPotEvent({
    "in": io["IO33"],
    "evs": EVS("red", ID_MISTNOST_Z19),
    "deadband": 0.5
})
```

## Z22 Example

Define the room ID in the controller/TNGL context:

```text
#define ID_MISTNOST_Z22 ID22
```

Then use this Berry snippet after `analog-pot-event.be`:

```berry
AnalogPotEvent({
    "in": io["IO32"],
    "evs": EVS("white", ID_MISTNOST_Z22),
    "deadband": 0.5
})

AnalogPotEvent({
    "in": io["IO33"],
    "evs": EVS("red", ID_MISTNOST_Z22),
    "deadband": 0.5
})
```

## Behavior

- The script samples each potentiometer several times and averages the result.
- It emits only when the integer percentage crosses the `deadband` hysteresis
  around the previous value.
- Values are clamped to `0..100`.
- `EVS(label, id)` keeps each room/controller scoped to its own EventState ID.
