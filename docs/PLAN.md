# Implementation plan

Status: initial localhost implementation running. Parent verification: 20 backend tests and 17 JavaScript/frontend tests passed; Chromium verified real PIN entry, direct API/image/CSV gating, a real JPEG preview, desktop/mobile home, and no JavaScript page errors. See RUNBOOK.md. Czech-first bilingual UI, pending-only review, and pastel Trail Maniacs-inspired palette are running after a controlled restart. Parent browser fixture verified decision/navigation/Undo/completion/gallery-return/CSV and live CS/EN switching. Final targeted independent review passed with no blockers; Linux deployment and backup/restore rehearsal are not yet verified.

## Stage 0: agree scope

- Resolve questions in REQUIREMENTS.md.
- Confirm network exposure, simultaneous usage, ordering, and pending-export policy.
- Confirmed: shared entry PIN `2026`, no personal passwords; any player may rejudge returned photos; Windows development; Linux LXC on Proxmox production.
- Confirmed: per-player last-action tracking releases unanswered reservations after 10 minutes; no session-based leases. Watermarked images only; production root `/srv/photo-grindr/photos/`.
- Metadata-only source discovery is complete; see PHOTO_LIBRARY.md. No ingestion, decoding, cloud download, or source modification has occurred.
- Confirmed: shared workload and outcomes, checks and balances on both liked/disliked sets, known-player list and username autocomplete.
- Record approved choices here or in architecture decision records.

Gate satisfied: user explicitly requested implementation and a locally running version on localhost.

## Stage 1: foundation and importer

- Create isolated environment and pin dependencies after compatibility checks.
- Implement app configuration, schema initialization/migrations, and repeatable indexing command.
- Generate orientation-correct previews; report corrupt/missing/unsupported files.
- Document actual install/import/run commands.

Verify: fixture import/re-import, duplicate basenames, missing/corrupt photos, replaced files, preview dimensions/orientation, safe path resolution, no original modifications.

## Stage 2: persistence and package engine

- Implement server-side PIN gate for pages/APIs/previews/CSV, signed entry/identity cookie, known-player list, autocomplete/similarity suggestions, and race-safe username creation. No database-backed login sessions.
- Implement exclusive shared allocation, per-photo review rounds, judgments, return requests, audit history, safe undo, 10-minute per-player inactivity release, resume, and completion.
- Add shared liked CSV export, assignment ownership, and stale-round checks. No reviewer-exclusion filters and no image-download feature.

Verify: exact and similar username suggestions without silent merging; concurrent username creation; all package sizes; exhausted and reserved-only queues; no double assignment under concurrency; returning liked and disliked photos; reallocation to any player, including previous judge and requester; preserved history; pending CSV exclusion; safe undo across interleaved players; stale rounds; restart; retries; abandoned-package release; before/at/after expiry boundaries; stale save versus reallocation races; active versus passive requests; shared-player multi-tab activity; PIN bypass attempts; spreadsheet-safe CSV.

## Stage 3: review interface

- Build mobile-first home with known-player picker/autocomplete, review card, shared liked/disliked galleries, history, and send-back-for-review controls.
- Add swipes, explicit decision buttons, edge navigation, undo, keyboard controls, and saving/error states.
- Preload nearby previews and keep UI state consistent with committed server state.

Verify: mouse and touch, swipe/click separation, portrait/landscape photos, responsive sizing, navigation without votes, undo returning to the affected photo, failure/retry behavior, refresh mid-package, and completion-to-home flow.

## Stage 4: end-to-end and deployment

- Exercise the full journey with multiple players and real browser interaction, including simultaneous claims, identity suggestions, and the judge -> challenge -> unrestricted re-review cycle.
- Run the actual library import and measure startup, preview generation, review latency, and concurrent saves.
- Document Windows development and Linux LXC production startup, environment variables, read-only photo mount/transfer, backups/restores, and library updates. Verify portable relative-path CSV behavior on both OSes.
- Test restore into a separate data directory.
- Document a short event-day runbook: start, smoke test, stop, consistent stopped-app database backup, and reopen months later with overdue reservations released and saved decisions intact.
- Keep this a short-lived, reusable tool rather than a permanent service; no mandatory scheduler, Redis, session database, or multi-event management.
- Explicit package-expired notification is confirmed; test return after inactivity and return after extended server downtime.

Gate: real tests and manual browser checks pass; unresolved limitations are documented. Do not claim large-library performance before the real library is available.

## Testing approach

Write failing automated tests before implementing backend behavior; test pure UI state/gesture logic where practical, then browser end-to-end tests. Use tiny generated fixtures for automated tests, not the event's private photos. Record commands and actual results as implementation proceeds.

## Initial repository deliverable

- README.md
- docs/REQUIREMENTS.md
- docs/ARCHITECTURE.md
- docs/PLAN.md
- docs/PHOTO_LIBRARY.md
- .gitignore

The initial planning-only stage is complete. Application code, pinned dependencies, metadata index, Czech/English UI, and local browser verification have since been delivered. Stage 4 Linux deployment and backup/restore rehearsal remain future work.
