# Nested Element Groups In Spectoda App JSON

This example shows how to configure nested element groups for the Spectoda App
using `elementsJson`, `controlPages`, and an optional `homepage` section.

It answers the common setup question:

> Can I have group -> groups -> devices?

Yes. A group is just an element with `childElementIds`. Those children can be
regular devices or other group elements. The app resolves the final Spectoda IDs
from the child tree.

## Files

- `elements-json.json` - copyable `elementsJson` array.
- `control-pages.json` - copyable `controlPages` array used by the elements.
- `network-fragment.json` - the same data wrapped as a minimal network JSON
  fragment with `homepage` and `topLevelElement`.

## Core Pattern

Use `childElementIds` for the tree:

```json
{
  "id": "element-group-stage",
  "name": "Stage",
  "childElementIds": [
    "element-group-stage-left",
    "element-group-stage-right",
    "element-backdrop-rgb"
  ]
}
```

Then use `controlPageRefs[].expandedElements[]` to decide which child cards are
expanded inline on that page:

```json
{
  "id": "DIMMA",
  "expandedElements": [
    {
      "id": "element-group-stage-left",
      "controlPageRef": {
        "id": "DIMMA"
      }
    },
    {
      "id": "element-backdrop-rgb",
      "controlPageRef": {
        "id": "COLOR"
      }
    }
  ]
}
```

Important rules:

- `expandedElements[].id` must be a direct child of the current group.
- A group cannot expand itself.
- The child must have the referenced page in its own `controlPageRefs`.
- If you nest more levels, repeat the same mapping on each group level.
- Leaf devices need `spectodaId`; groups usually do not.
- Keep every `spectodaId` in the `0..255` range.

## Why `expandedElements` Matters

Without `expandedElements`, a group can still open as a card, but the app does
not know which child controls should be rendered inline on the parent page.

With `expandedElements`, the parent group can show child groups and devices in
one compact control page. This is useful for areas such as:

- event decoration blocks grouped by physical location
- rooms composed of direct, indirect, and RGB lighting
- larger DALI zones split across several controllers

## Example Tree

```text
All Deco Blocks
|-- Stage
|   |-- Stage Left
|   |   |-- Stage Left Main
|   |   `-- Stage Left Ambient
|   |-- Stage Right
|   |   |-- Stage Right Main
|   |   `-- Stage Right Ambient
|   `-- Backdrop RGB
|-- Bar
|   |-- Bar Front White
|   |-- Bar Back RGB
|   `-- Bar Logo Ambient
`-- Logo Tower
```

The parent groups use the `DIMMA` page for whole-group brightness. The expanded
children can point to `DIMMA`, `AMBER`, or `COLOR`, depending on what that child
actually supports.

## Control Page Notes

This example uses three minimal event control pages:

- `DIMMA` - brightness slider using `EVS { "type": 30, "label": "brigh" }`.
- `AMBER` - brightness plus temperature slider.
- `COLOR` - color picker plus brightness slider.

The exact EventState labels must match the firmware/TNGL behavior of the real
project. Rename labels such as `brigh`, `tempe`, or `color` only if the project
uses different labels.
