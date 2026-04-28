# ID_MISTNOST_Z22 must be defined in the controller/TNGL context, for example:
# #define ID_MISTNOST_Z22 ID22

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
