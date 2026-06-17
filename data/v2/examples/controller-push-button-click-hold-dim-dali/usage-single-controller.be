# ID_LAMP must be defined in the controller/TNGL context, for example:
# #define ID_LAMP ID1

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
