# Proposed architecture

Status: proposed, not implemented. Dependency versions will be checked, pinned, and tested at implementation time.

## Stack and rationale

- Python + Flask: one server renders pages and provides small JSON endpoints.
- HTML/CSS + vanilla JavaScript: responsive photo-review UI and pointer gestures, without a frontend build chain.
- SQLite through Python's sqlite3: persisted players, packages, decisions, and undo history in one local file.
- Pillow: generate appropriately sized previews with EXIF orientation correction.
- Select a production WSGI server after deployment OS is confirmed; never expose Flask's development server as production.

This is a proposal to minimize moving parts, not a claim that production performance has been validated. SQLite serializes writes, so transactions must stay short and concurrent-write behavior must be tested.

## Storage layout

- Configured PHOTO_DIR: existing originals outside Git, read-only to the app where feasible.
- Configured DATA_DIR: SQLite database and generated previews, outside Git.
- Example local names data/ and photos/ are ignored as a safety net; real paths are configuration.
- Database contains metadata and decisions, not image blobs.
- Build previews during an explicit import/index command, not during the first swipe.
- Serve previews for reviewing; optionally request an original for detail inspection through a controlled route.
- Preload only a small number of next images, not the whole library.

## Import/index policy

- Start with JPEG, PNG, and WebP; confirm actual formats before implementing. RAW/HEIC support is not assumed.
- Store original filename and unique relative path, plus size, modification time, dimensions, and availability.
- Use stable photo IDs; re-indexing the same path must not delete decisions or create duplicates.
- Record missing/corrupt files; do not silently delete their history.
- Flag replacements at an existing path for explicit handling rather than silently transferring old votes to different content.
- Correct EXIF orientation in generated previews and preserve aspect ratio; never modify originals.

## Proposed relational model

- players(id, username_key UNIQUE, display_name, created_at)
- photos(id, relative_path UNIQUE, filename, size_bytes, mtime, width, height, availability)
- packages(id, player_id, requested_size, status, current_position, created_at, completed_at)
- package_items(package_id, photo_id, position): unique membership and position per package.
- decisions(player_id, photo_id, value, updated_at): one current like/dislike per player/photo.
- decision_events(id, player_id, photo_id, package_id nullable, previous_value nullable, new_value, undone_at nullable, request_id UNIQUE, created_at)

Enable foreign keys; use parameterized SQL. Package allocation is transactional. Decision, event, package completion, and undo updates must be atomic. Use idempotency keys to prevent network retries from adding duplicate events. Treat undo as an ordered player-wide decision history, including gallery changes; detect stale/conflicting writes from multiple tabs rather than overwriting silently.

## Proposed HTTP surface (illustrative, not an implementation contract)

- GET / : home / identity selection.
- POST /session : choose identity under the approved access model.
- POST /api/packages : allocate a package or return the existing unfinished one.
- GET /api/packages/<id> : ordered photos, decisions, and progress.
- PUT /api/photos/<id>/decision : like/dislike with idempotency and expected state.
- POST /api/undo : reverse the latest eligible decision event.
- GET /liked : current player's gallery.
- GET /export.csv : current player's liked filenames/paths.
- GET /photos/<id>/preview : controlled preview access.

Navigation state may be persisted separately and does not imply a decision. Mutating routes use CSRF protection and verify resource ownership. The server derives the player from the session, not from an arbitrary submitted player ID.

## Deployment and data protection

- One server with durable local disk; do not use ephemeral-only storage for the database.
- Do not put SQLite on a shared network filesystem.
- Back up SQLite using its backup interface or a consistent stopped-server backup; do not assume copying an active DB file alone is sufficient.
- Keep a separate backup of originals. Previews can be regenerated.
- Restrict photo routes to indexed IDs; resolve paths under PHOTO_DIR and reject traversal, including symlinks escaping the root.
- Session signing secret is environment configuration, never committed.
- HTTPS and appropriate cookie flags for public deployment; access model must be approved first.
- Escape user-provided display names; validate package sizes, decision values, and input lengths.
- No automatic deletion of photos or sharing selections between players.

## Sources consulted

- Flask SQLite pattern: https://flask.palletsprojects.com/en/stable/patterns/sqlite3/
- Flask database tutorial (including serialized-write limitation): https://flask.palletsprojects.com/en/stable/tutorial/database/
- Pillow orientation and resizing reference: https://pillow.readthedocs.io/en/stable/reference/ImageOps.html

## Unvalidated assumptions

Modest simultaneous usage, one event, supported image formats, server-local durable storage, and independent personal photo selection. Confirm access/deployment before implementation; benchmark rather than infer throughput.
