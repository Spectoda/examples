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
  `5305`). Čte `data/v2` build-time přes `import.meta.glob`. Je read-only:
  autoring příkladů zůstává Git-native, ne přes appku.
- Lehký obsahový model záměrně NEpoužívá striktní `module-data.v2.json`
  yaml-only kolekci — ta by odmítla kopírovatelné `.be`/`.tngl`/`.json` soubory.
- U controller příkladů vždy uveď config předpoklady a firmware/runtime
  gotchas. Například analog 0-3.3 V na ESP32 se čte přes `type: "ADC"`, ne přes
  zatím neimplementované `GPI` + `variant: "ANALOG"`.

## Creator Kit boundary

- `creator-kit/` is a generated, read-only distribution candidate, not an
  authoring surface.
- The candidate is synthetic-fixture-only until Documentation records an
  authorized redistribution license. Never copy private Documentation bodies,
  customer context or partner-local knowledge here.
- Keep exact-version pins, the fixed synthetic fixture lock in source
  frontmatter, the generated source-lock commit equal to the exact reviewed
  Git head, checksums, license posture and the
  `unpublished` stable-channel descriptor intact. Updates require partner
  approval and a normal review PR.
- The candidate workflows may validate or prepare a release, but agents must
  not trigger a generated public-content PR, GitHub Release or partner
  Organization mutation without fresh explicit instruction.
- Do not add a generic Lazurio installer to this repository; hand that contract
  to HumanAndMachines/Lazurio through its own governed planning flow.

## Hranice

- `modules/examples/` není source of truth pro zákaznickou dokumentaci. Hotové
  zákaznické návody patří do `modules/documentation/`.
- `modules/examples/` není source of truth pro produktovou identitu ani ceník.
  To zůstává v `modules/products/` a `modules/pricebook/`.
- Příklad může odkazovat na firmware nebo dokumentaci, ale nemá duplikovat
  dlouhé interní reference.
