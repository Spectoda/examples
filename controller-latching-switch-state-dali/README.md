# Latching Switch State For DALI

This example maps a normal latching wall switch to Spectoda `toggl`
EventStates.

Use this pattern for a regular on/off wall switch without a spring return:

- closed / connected switch state writes `100%`
- open / disconnected switch state writes `0%`
- the current switch position is emitted once when the script starts
- later writes happen only when the physical switch position changes

This is different from a momentary push button. A momentary button should use a
click helper such as `OnClickToggle(...)` or `OnClickToggleGroup(...)`.

## Files

- `latching-switch-state.be` - reusable Berry helper.
- `usage-sc-4i.tngl` - copyable SC 4i usage snippet for `SW1..SW4`.
- `final-project.tngl` - compact TNGL project fragment with the helper, SC 4i
  usage, and illustrative DALI segment mapping.

## Controller Assumptions

The example assumes the controller exposes digital inputs as:

- `io["SW1"]`
- `io["SW2"]`
- `io["SW3"]`
- `io["SW4"]`

For SC 4i A, the wall switch is wired between `Lsw` and the selected `SWx`
input. The example assumes `input.read()` returns `1` when the switch is closed
and `0` when it is open.

If the controller config or hardware revision reads the opposite polarity, set
`"on_value": 0` in the helper call.

## Berry Helper

Add the helper before the controller usage snippets:

```berry
def LatchingSwitchState(S)
    var input = S["in"]
    var evs = S["evs"]
    var on_value = S.find("on_value", 1)
    var emit_initial = S.find("emit_initial", true)
    var raw = input.read() == 0 ? 0 : 1
    var last = raw == on_value ? 1 : 0
    var first = emit_initial ? 1 : 0

    return Plugin(def()
        raw = input.read() == 0 ? 0 : 1
        var state = raw == on_value ? 1 : 0

        if !first && state == last
            return
        end

        first = 0
        last = state
        var pct = state ? 100 : 0

        for e : evs
            e.set(pct, PERCENTAGE)
        end
    end)
end
```

## SC 4i Usage Pattern

Use one `LatchingSwitchState(...)` call per physical switch input.

```berry
LatchingSwitchState({
    "in": io["SW1"],
    "evs": [EVS("toggl", ID1)],
    "on_value": 1
})

LatchingSwitchState({
    "in": io["SW2"],
    "evs": [EVS("toggl", ID2)],
    "on_value": 1
})
```

One switch can also control a logical group. Pass every target EventState in the
same `evs` list:

```berry
LatchingSwitchState({
    "in": io["SW3"],
    "evs": [EVS("toggl", ID3), EVS("toggl", ID4)],
    "on_value": 1
})
```

## Behavior

- On script start, the helper writes the current physical switch state unless
  `"emit_initial": false` is set.
- When the switch changes to the ON position, every target `toggl` EventState is
  set to `100%`.
- When the switch changes to the OFF position, every target `toggl` EventState
  is set to `0%`.
- The helper does not continuously rewrite the same value in every controller
  loop, so app-side control is not immediately overwritten until the next
  physical switch change or script restart.
- Use stable IDs that are already referenced by the Spectoda App or project
  EventStates.
