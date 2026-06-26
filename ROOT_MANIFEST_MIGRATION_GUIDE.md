# Root manifest migration guide

## Purpose

This repository currently serves the production checklist from the existing root `index.html`.
The files added here are **templates only** unless they are explicitly wired into the production viewer.

## Added templates

- `board.manifest.template.json`
- `boards/sprite-seirei.YYYYMMDD.template.json`
- `events/sprite-seirei.YYYYMMDD.events.template.json`

## Intended migration order

1. Verify the draft in `/dev/editor.html`
2. Verify the display in `/dev/json-viewer.html`
3. Pass `/dev/verification.html`
4. Prepare versioned production files from the templates
5. Add a real production manifest file
6. Update the production viewer to read the manifest
7. Switch production only after the manifest-based viewer is confirmed

## Important rule

Do not overwrite the current root `index.html` directly during the early migration phase.
First complete the manifest-based file structure, then move the production viewer to that structure.

## Storage key compatibility rule

The manifest-based production viewer must preserve compatibility with the legacy production storage keys unless there is an explicit migration decision.

Keep using these keys for the current `sprite-seirei` production board:

- `fortnite_sprite_checklist_v4`
- `fortnite_sprite_checklist_name_v1`
- `fortnite_sprite_checklist_name_color_v1`
- `fortnite_sprite_checklist_name_size_v1`
- `fortnite_sprite_checklist_lang_v1`

When creating a new production board JSON, write the storage keys explicitly in the board file instead of relying on implicit defaults.

## Suggested real file names

- `board.manifest.json`
- `boards/sprite-seirei.20260626.json`
- `events/sprite-seirei.20260626.events.json`
- `images/imagessprseireiv3.png`

## Current migration status

The repository now has a manifest-based production structure in parallel with the existing project assets.
Before further production changes, confirm the live browser behavior for:

- click position accuracy
- saved state continuity
- language switching
- PNG export alignment
- complete badge rendering
