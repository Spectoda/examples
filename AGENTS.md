# AGENTS.md — `modules/examples`

Tento modul je public repo pro ukázky použití Spectoda kontrolerů, Berry
scriptů, projektových patternů a integračních snippetů.

## Rozsah

- Držet malé, kopírovatelné a veřejně bezpečné příklady.
- Vysvětlit praktické zapojení, controller config, Berry/TNGL snippet a
  očekávané chování.
- Sloužit jako místo, kam se přesouvají dobré opakovatelné příklady z chatu,
  realizací a interní podpory.

## Pravidla obsahu

- Příklady piš primárně anglicky, protože repo je public.
- Necommituj secrets, privátní MAC adresy, reálné network keys, credentials ani
  zákaznická data, která nejsou výslovně public.
- Pokud příklad vychází z reálné instalace, anonymizuj klienta a ponech jen
  technický pattern.
- Každý příklad má mít vlastní složku s `README.md` a soubory, které jdou
  zkopírovat do controller setupu.
- U controller příkladů vždy uveď config předpoklady a firmware/runtime
  gotchas. Například analog 0-3.3 V na ESP32 se čte přes `type: "ADC"`, ne přes
  zatím neimplementované `GPI` + `variant: "ANALOG"`.

## Hranice

- `modules/examples/` není source of truth pro zákaznickou dokumentaci. Hotové
  zákaznické návody patří do `modules/documentation/`.
- `modules/examples/` není source of truth pro produktovou identitu ani ceník.
  To zůstává v `modules/products/` a `modules/pricebook/`.
- Příklad může odkazovat na firmware nebo dokumentaci, ale nemá duplikovat
  dlouhé interní reference.
