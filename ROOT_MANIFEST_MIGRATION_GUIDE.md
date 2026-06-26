# Root manifest migration guide

## Purpose

This repository currently serves the production checklist from the existing root `index.html`.
The files added here are **templates only**. They do not change the current production behavior by themselves.

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

## Suggested real file names

- `board.manifest.json`
- `boards/sprite-seirei.20260626.json`
- `events/sprite-seirei.20260626.events.json`
- `images/imagessprseireiv3.png`
