# Implementation plan

Status: awaiting product/architecture approval. Only repository initialization and planning documentation are authorized in this stage.

## Stage 0: agree scope

- Resolve questions in REQUIREMENTS.md.
- Confirm photo directory/formats, deployment target, access model, and ordering.
- Record approved choices here or in architecture decision records.

Gate: user approval before application implementation.

## Stage 1: foundation and importer

- Create isolated environment and pin dependencies after compatibility checks.
- Implement app configuration, schema initialization/migrations, and repeatable indexing command.
- Generate orientation-correct previews; report corrupt/missing/unsupported files.
- Document actual install/import/run commands.

Verify: fixture import/re-import, duplicate basenames, missing/corrupt photos, replaced files, preview dimensions/orientation, safe path resolution, no original modifications.

## Stage 2: persistence and package engine

- Implement identity under the agreed security model.
- Implement transactional package allocation, decision writes, undo, progress, resume, and completion.
- Add CSV export and ownership checks.

Verify: isolated players, all package sizes, partial final package, exhausted library, no duplicates, persistence after restart, repeated requests, undo chains, tab conflicts, concurrent writes, current-like CSV and spreadsheet-safe cells.

## Stage 3: review interface

- Build mobile-first home, review card, and liked-gallery screens.
- Add swipes, explicit decision buttons, edge navigation, undo, keyboard controls, and saving/error states.
- Preload nearby previews and keep UI state consistent with committed server state.

Verify: mouse and touch, swipe/click separation, portrait/landscape photos, responsive sizing, navigation without votes, undo returning to the affected photo, failure/retry behavior, refresh mid-package, and completion-to-home flow.

## Stage 4: end-to-end and deployment

- Exercise the full journey with multiple players and real browser interaction.
- Run the actual library import and measure startup, preview generation, review latency, and concurrent saves.
- Document production startup for the chosen OS, environment variables, backups/restores, and photo-library updates.
- Test restore into a separate data directory.

Gate: real tests and manual browser checks pass; unresolved limitations are documented. Do not claim large-library performance before the real library is available.

## Testing approach

Write failing automated tests before implementing backend behavior; test pure UI state/gesture logic where practical, then browser end-to-end tests. Use tiny generated fixtures for automated tests, not the event's private photos. Record commands and actual results as implementation proceeds.

## Initial repository deliverable

- README.md
- docs/REQUIREMENTS.md
- docs/ARCHITECTURE.md
- docs/PLAN.md
- .gitignore

No application code, installed dependencies, or photo ingestion in this initial stage.
