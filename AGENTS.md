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
- Každý příklad má mít vlastní složku v `data/v2/examples/<slug>/` s `README.md`,
  kopírovatelnými soubory a `example.yaml` metadata sidecarem (title, category,
  summary, tags, hardware, seznam souborů). `data/v2/` je source of truth;
  obsahový model a postup přidání příkladu drží `data/v2/README.md`.
- `app/v2/` je prohlížecí appka Examples v2 (React + Vite + TS, Launchpad port
  `24708`). Čte `data/v2` build-time přes `import.meta.glob`. Je read-only:
  autoring příkladů zůstává Git-native, ne přes appku.
- Lehký obsahový model záměrně NEpoužívá striktní `module-data.v2.json`
  yaml-only kolekci — ta by odmítla kopírovatelné `.be`/`.tngl`/`.json` soubory.
- U controller příkladů vždy uveď config předpoklady a firmware/runtime
  gotchas. Například analog 0-3.3 V na ESP32 se čte přes `type: "ADC"`, ne přes
  zatím neimplementované `GPI` + `variant: "ANALOG"`.

## Creator Kit boundary

- `creator-kit/` is a generated, read-only public snapshot, not an authoring
  surface. Documentation remains authoritative; the public copy is immutable
  and flows in one direction only.
- The `0.1.0-rc.4` review candidate contains seven CC BY 4.0 Documentation
  derivatives, the complete hash-locked FW 0.12.11 config contract/schema and
  one MIT-licensed sparse global Event Player example. The published rc.3
  remains immutable until a separate protected rc.4 release is explicitly
  approved. Spectoda names, logos and trademarks are outside those grants.
- Keep exact source commits, the Documentation bundle digest, firmware
  provenance, example hashes, checksums and the `unpublished` stable-channel
  descriptor intact. Updates require partner approval and a normal review PR.
- Public CI validates the committed snapshot and deterministically packages it;
  it does not require access to private Documentation. Agents must not trigger
  another GitHub Release or partner Organization mutation without fresh
  explicit instruction.
- Do not add a generic Lazurio installer to this repository; hand that contract
  to HumanAndMachines/Lazurio through its own governed planning flow.

## Hranice

- `modules/examples/` není source of truth pro zákaznickou dokumentaci. Hotové
  zákaznické návody patří do `modules/documentation/`.
- `modules/examples/` není source of truth pro produktovou identitu ani ceník.
  To zůstává v `modules/products/` a `modules/pricebook/`.
- Příklad může odkazovat na firmware nebo dokumentaci, ale nemá duplikovat
  dlouhé interní reference.
