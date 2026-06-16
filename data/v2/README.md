# Examples `data/v2`

Source of truth for the Spectoda examples that the Examples v2 browsing app
(`modules/examples/app/v2`) renders. This is a **lightweight content model**, not
a strict business filesystem DB: examples are public, read-only, copyable
reference patterns, so the original source files stay in place next to a small
metadata sidecar.

## Layout

```text
data/v2/
├── README.md                         # this file
└── examples/
    └── <example-slug>/
        ├── example.yaml              # metadata sidecar (drives the browsing app)
        ├── README.md                 # human explanation: use case, wiring, behavior
        └── *.be / *.tngl / *.json    # copyable source files (kept as-is)
```

The directory name (`<example-slug>`) describes the use case, not the client.
Source files are kept copyable and are **not** embedded into YAML.

## `example.yaml` fields

| field          | meaning                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| `schemaVersion`| `example.v2`                                                            |
| `slug`         | folder name, stable, lowercase-hyphen                                    |
| `title`        | short human title (English; this repo is public)                        |
| `category`     | one of `controller`, `espnow-remote`, `network-pattern`                 |
| `summary`      | 1-3 sentence use case + expected behavior                               |
| `tags`         | lowercase-hyphen technical tags for filtering                           |
| `hardware`     | controller/hardware assumptions, wiring and controller-config notes      |
| `files`        | every file in the folder with `path`, `role` and `language`             |
| `related`      | optional slugs of related examples                                      |

`language` is one of `berry` (`.be`), `tngl` (`.tngl`), `json` (`.json`) or
`markdown` (`.md`).

## How to add a new example

1. Create `data/v2/examples/<new-slug>/` with a `README.md` (use case, wiring
   assumptions, expected behavior) and the copyable source files.
2. Add an `example.yaml` sidecar with the fields above; list **every** file in
   the folder under `files` with its role and language.
3. Keep it public-safe: no customer data, no real MAC addresses, no network
   keys, no credentials. Use illustrative IDs (ID1..ID12, Z19, Z22) or
   placeholders.
4. The browsing app picks it up automatically on the next build (it globs
   `data/v2/examples/*/example.yaml` and the referenced source files at build
   time).

## Boundaries

- This is not the source of truth for customer documentation
  (`modules/documentation/`) nor for product identity / pricing
  (`modules/products/`, `modules/pricebook/`). Examples may reference them but
  must not duplicate them.
- This is a lightweight content model. It is intentionally **not** registered as
  a strict `module-data.v2.json` yaml-only collection, because that validator
  would reject the copyable `.be`/`.tngl`/`.json` source files that are the whole
  point of an example.
