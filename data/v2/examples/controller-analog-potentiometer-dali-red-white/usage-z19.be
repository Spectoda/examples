# ID_MISTNOST_Z19 must be defined in the controller/TNGL context, for example:
# #define ID_MISTNOST_Z19 ID19

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
