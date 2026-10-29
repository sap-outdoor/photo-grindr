# Implementation plan

Status: awaiting product/architecture approval. Only repository initialization and planning documentation are authorized in this stage.

## Stage 0: agree scope

- Resolve questions in REQUIREMENTS.md.
- Confirm photo directory/formats, deployment target, access model, and ordering.
- Confirm independent re-review eligibility, pending-export policy, and abandoned-assignment release.
- Confirmed: shared workload and outcomes, checks and balances on both liked/disliked sets, known-player list and username autocomplete.
- Record approved choices here or in architecture decision records.

Gate: user approval before application implementation.

## Stage 1: foundation and importer

- Create isolated environment and pin dependencies after compatibility checks.
- Implement app configuration, schema initialization/migrations, and repeatable indexing command.
- Generate orientation-correct previews; report corrupt/missing/unsupported files.
- Document actual install/import/run commands.

Verify: fixture import/re-import, duplicate basenames, missing/corrupt photos, replaced files, preview dimensions/orientation, safe path resolution, no original modifications.

## Stage 2: persistence and package engine

- Implement known-player list, autocomplete/similarity suggestions, explicit identity selection, and race-safe username creation under the agreed access model.
- Implement exclusive shared allocation, per-photo review rounds, judgments, return requests, audit history, safe undo, reservation release, resume, and completion.
- Add shared liked CSV export, assignment ownership, and reviewer-eligibility checks.

Verify: exact and similar username suggestions without silent merging; concurrent username creation; all package sizes; exhausted and reserved-only queues; no double assignment under concurrency; returning liked and disliked photos; eligible reallocation; preserved history; pending CSV exclusion; safe undo across interleaved players; stale rounds; restart; retries; abandoned-package release; spreadsheet-safe CSV.

## Stage 3: review interface

- Build mobile-first home with known-player picker/autocomplete, review card, shared liked/disliked galleries, history, and send-back-for-review controls.
- Add swipes, explicit decision buttons, edge navigation, undo, keyboard controls, and saving/error states.
- Preload nearby previews and keep UI state consistent with committed server state.

Verify: mouse and touch, swipe/click separation, portrait/landscape photos, responsive sizing, navigation without votes, undo returning to the affected photo, failure/retry behavior, refresh mid-package, and completion-to-home flow.

## Stage 4: end-to-end and deployment

- Exercise the full journey with multiple players and real browser interaction, including simultaneous claims, identity suggestions, and the judge -> challenge -> independent re-review cycle.
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
