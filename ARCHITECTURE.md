# Examples Architecture

## Purpose

`modules/examples` is a public Git-native repository for practical Spectoda
usage examples.

It collects small, reusable setups that are too specific for product
documentation, but valuable as copyable references for technicians, developers,
and partners.

## Source Of Truth

Git is the source of truth. Examples are authored directly in this repository.

Firebase is not an authoring store for this module.

## Layout

Each example lives in its own directory:

```text
<example-slug>/
├── README.md
├── *.be
├── *.json
└── optional supporting files
```

The directory name should describe the use case, not the client.

## Boundaries

- Product identity belongs in `modules/products`.
- Customer-facing documentation belongs in `modules/documentation`.
- Internal process guidance belongs in `modules/wiki`.
- Firmware source and runtime behavior belong in `modules/firmware`.

This repository can reference those sources, but should not become their
replacement.

