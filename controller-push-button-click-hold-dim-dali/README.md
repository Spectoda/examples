# Push Button Click And Hold Dimmer For DALI

This example maps one momentary wall push button to common light-control
behavior:

- short click toggles the light on or off
- hold starts dimming after a configurable delay
- release stops dimming at the current brightness
- the next hold moves in the opposite dimming direction

Use this pattern for a spring-return push button. Do not use it for a normal
latching on/off wall switch without a spring return; latching switches should
use a state-mapping helper instead.

## Files

- `push-button-click-hold-dimmer.be` - reusable Berry helper.
- `usage-single-controller.be` - copyable Berry usage snippet for one
  controller input.
- `final-project.tngl` - compact TNGL project fragment with the helper, usage,
  DALI segment and brightness layer.

## Controller Assumptions

The example assumes the wall push button is exposed as:

- `io["SW1"]`

The input must read `1` while the button is pressed and `0` while it is
released. If the controller config or wiring reads the opposite polarity, set
`"pressed_value": 0` in the helper call.

Do not attach another click/toggle helper to the same physical input. This
helper already handles both the short-click and hold paths.

## EventStates

The helper writes two EventStates:

- `EVS("brigh", ID_LAMP)` - actual brightness from `0..100%`.
- `EVS("toggl", ID_LAMP)` - optional on/off state, `100%` when brightness is
  above the minimum and `0%` at the minimum.

Keep `toggl` when the Spectoda App or an existing project expects a separate
on/off EventState. The brightness layer must still use `brigh`; otherwise the
hold dimming will not be visible in the project.

## Berry Usage Pattern

Define the lamp ID in the controller/TNGL context:

```text
#define ID_LAMP ID1
```

Then use this Berry snippet after `push-button-click-hold-dimmer.be`:

```berry
PushButtonClickHoldDimmer({
    "in": io["SW1"],
    "brigh": EVS("brigh", ID_LAMP),
    "toggl": EVS("toggl", ID_LAMP),
    "pressed_value": 1,
    "dim_min": 1,
    "hold_ms": 600,
    "step_ms": 80,
    "step_pct": 1
})
```

With `hold_ms: 600`, a press shorter than about `0.6 s` is treated as a short
toggle click. With `step_ms: 80` and `step_pct: 1`, a full sweep from `0%` to
`100%` takes about 8 seconds. Lower `step_ms` or increase `step_pct` for faster
dimming.

## Behavior

- A press shorter than `hold_ms` toggles brightness between `0%` and the last
  brightness above `dim_min`.
- If there is no previous non-zero brightness, short-click ON uses `on_pct`
  which defaults to `100%`.
- A press held for at least `hold_ms` starts changing `brigh`.
- Hold dimming down stops at `dim_min`, which defaults to `1%`, so holding the
  button cannot fully turn the light off.
- `dim_min` is not saved as the next short-click ON brightness. If the light
  was dimmed down to the floor and then turned off, the next short click
  restores the previous brightness above `dim_min`.
- Releasing while dimming stops at the current value and prepares the opposite
  direction for the next hold.
- Reaching `dim_min` arms the next hold upward; reaching `100%` arms the next
  hold downward.
- If the button is already held while the script starts, the helper waits until
  release before arming the next press.
- `debounce_ms` filters short contact bounce before the helper treats the input
  as pressed or released.

## DALI Layer Pattern

The final TNGL maps `brigh` directly to the segment brightness:

```tngl
var brigh = genLastEventParam($brigh);

siftSegments({ segment($DALI_LAMP); }, {
  addLayer(0s, Infinity, {
    addDrawing(0s, Infinity, animFill(Infinity, #ffffff));
  }).modifyBrightness(&brigh);
});
```

Keep the DALI driver dimming curve and the project brightness curve aligned
with the real installation.
