# ID_LAMP must be defined in the controller/TNGL context, for example:
# #define ID_LAMP ID1

ToggleButtonDimmer({
    "in": io["SW1"],
    "brigh": EVS("brigh", ID_LAMP),
    "toggl": EVS("toggl", ID_LAMP),
    "step_ms": 80,
    "step_pct": 1
})
