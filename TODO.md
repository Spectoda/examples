# Examples TODO

## Current Focus

- Establish the repository as the public place for Spectoda controller and
  scripting examples.
- Add the first documented example for analog potentiometers controlling DALI
  `white` and `red` channels through EventStates.

## Next Steps

- Add more controller examples from real support and commissioning cases.
- Decide a lightweight naming convention for hardware families and example
  categories.
- Link selected examples from public documentation when they become stable.

## Findings

- Analog ESP32 inputs for 0-3.3 V potentiometers should use controller IO
  `type: "ADC"` and Berry `read(1)` for 11 dB attenuation.
- `GPI` with `variant: "ANALOG"` is not a working analog path in the current
  firmware parser.
- For the ABCDE extension terminal used in this example, the expected mapping
  is `A=3V3`, `B=IO33`, `C=IO32`, `D=GND`, and `E=NC/spare`.
- ADC readings can jitter around integer percentage boundaries; the Berry
  helper now uses a configurable `deadband` to suppress adjacent-value spam.
- If DALI drivers are already configured for linear dimming, keep
  project-level `LOGARITHMIC CORRECTION` blocks disabled so the potentiometer
  percentage maps directly to driver brightness.
- The final working project is captured as `final-project.tngl`; future
  examples should include the same kind of complete final artifact when
  available.
