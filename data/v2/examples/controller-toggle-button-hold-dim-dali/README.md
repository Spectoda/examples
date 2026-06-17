# Toggle Button Hold Dimmer For DALI

This example shows how to use one physical lamp-style toggle button as a
single-control dimmer:

- change the physical switch state once: brightness starts moving
- change the physical switch state again: brightness stops at the current value
- the next start moves in the opposite direction
- reaching `0%` arms the next switch change upward
- reaching `100%` arms the next switch change downward

The pattern is useful when a wall control exposes only one digital input, but
the installation still needs more than simple on/off control.

## Files

- `toggle-button-dimmer.be` - reusable Berry helper.
- `usage-single-controller.be` - copyable Berry usage snippet for one
  controller input.
- `controller-config.json` - illustrative controller config with one `GPI`
  input and one DALI output.
- `final-project.tngl` - compact TNGL project fragment with the helper, usage,
  DALI segment and brightness layer.

## Controller Assumptions

The example assumes the wall button is exposed as:

- `io["SW1"]`

The input must read `1` while the button is pressed or latched on, and `0`
while it is released or latched off.

For a dry contact wired to ground, configure the input as inverted with pull-up:

```json
"SW1": {
  "type": "GPI",
  "!pin+": 27
}
```

Use the actual input pin from the controller. If the reading is reversed, swap
between `pin+` and `!pin+` in the controller config, or adapt the wiring.

## EventStates

The helper writes two EventStates:

- `EVS("brigh", ID_LAMP)` - actual brightness from `0..100%`.
- `EVS("toggl", ID_LAMP)` - optional on/off state, `100%` when brightness is
  above the minimum and `0%` at the minimum.

`toggl` is optional in the helper call. Keep it when the Spectoda App or an
existing project already expects a separate on/off EventState.

## Berry Usage Pattern

Define the lamp ID in the controller/TNGL context:

```text
#define ID_LAMP ID1
```

Then use this Berry snippet after `toggle-button-dimmer.be`:

```berry
ToggleButtonDimmer({
    "in": io["SW1"],
    "brigh": EVS("brigh", ID_LAMP),
    "toggl": EVS("toggl", ID_LAMP),
    "step_ms": 80,
    "step_pct": 1
})
```

With the default `step_ms: 80` and `step_pct: 1`, the full sweep from `0%` to
`100%` takes about 8 seconds. Lower `step_ms` or increase `step_pct` for faster
dimming.

## Behavior

- The helper syncs from the current `brigh` EventState when movement starts, so
  app-side brightness changes are respected.
- A switch change from `0%` always moves up.
- A switch change from `100%` always moves down.
- Any physical switch change while brightness is moving stops it and prepares
  the opposite direction for the next start.
- If the button stays in one position until an endpoint, the helper stops
  there. The next physical switch change starts moving in the opposite
  direction.

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
with the real installation. If the connected drivers already provide the
intended curve, avoid adding a second correction in the project layer.
