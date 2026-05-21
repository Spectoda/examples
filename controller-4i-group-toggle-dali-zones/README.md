# 4I Group Toggle For DALI Zones

This example shows how to use one physical 4-input controller button to toggle
multiple Spectoda `toggl` EventStates as one group.

The pattern solves a common issue with repeated single-target toggles:

- `OnClickToggle(...)` per ID toggles each ID from its own current state.
- If some IDs are on and some are off, one click can only swap the mixed state.
- `OnClickToggleGroup(...)` chooses one target state for the whole group and
  writes that value to every ID.

In this implementation, mixed state is treated as "something is on", so the
next click turns the whole group off. When all IDs are off, the next click
turns the whole group on.

## Files

- `on-click-toggle-group.be` - reusable Berry helper.
- `usage-two-4i-controllers.tngl` - usage snippet for two mirrored 4I
  controllers with `SW1` and `SW2`.
- `final-project.tngl` - compact TNGL project fragment with the helper,
  controller usage, and DALI segment mapping for `ID1..ID12`.

## Controller Assumptions

The example assumes the controller exposes digital inputs as:

- `io["SW1"]`
- `io["SW2"]`

Use the IO names from the actual controller definition. If the hardware config
uses different names such as `BTN1` and `BTN2`, update the usage snippet
accordingly.

The DALI outputs in `final-project.tngl` are illustrative:

- `SC_01` owns `ID1..ID4`
- `SC_02` owns `ID5..ID8`
- `SC_03` owns `ID9..ID12`
- each ID maps to a DALI address range on that controller

Keep the IDs stable in the real project if they are already referenced by the
Spectoda App or by existing EventStates.

## Berry Helper

Add the helper after the Spectoda App core `ClickCounter` class is available:

```berry
def OnClickToggleGroup(S)
    var in = S["in"]
    var evs = S["evs"]
    var cc = ClickCounter(S)

    return Plugin(def()
        if cc.update(in.read())
            if cc.clicked() == 1
                var any_on = 0

                for e : evs
                    if e
                        any_on = 1
                    end
                end

                var v = any_on ? 0 : 100

                for e : evs
                    e.set(v, PERCENTAGE)
                end
            end
        end
    end)
end
```

## 4I Usage Pattern

Use one `OnClickToggleGroup(...)` call per physical input and pass the whole
EventState group as a list.

```berry
OnClickToggleGroup({
    "in": io["SW2"],
    "evs": [EVS("toggl", ID1), EVS("toggl", ID3), EVS("toggl", ID5), EVS("toggl", ID7), EVS("toggl", ID9), EVS("toggl", ID11)]
})

OnClickToggleGroup({
    "in": io["SW1"],
    "evs": [EVS("toggl", ID2), EVS("toggl", ID4), EVS("toggl", ID6), EVS("toggl", ID8), EVS("toggl", ID10), EVS("toggl", ID12)]
})
```

The same snippet can be placed into two mirrored controllers when both wall
buttons should control the same two logical groups.

## Behavior

- If every target ID is off, one click turns every target ID on.
- If one or more target IDs are on, one click turns every target ID off.
- The physical input has one `ClickCounter`, so the group is evaluated once
  per click instead of once per target ID.
- The helper writes `0%` or `100%` to each `EVS("toggl", id)` with
  `PERCENTAGE` units.

## When To Use This Instead Of `OnClickToggle`

Use `OnClickToggleGroup(...)` when one physical button represents a single
logical area composed of several IDs, for example:

- direct light zones across multiple DALI controllers
- indirect light zones across multiple DALI controllers
- mirrored left/right wall switches controlling the same set of zones

Keep `OnClickToggle(...)` for a button that intentionally controls exactly one
EventState.
