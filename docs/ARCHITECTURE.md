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
- photos(id, relative_path UNIQUE, filename, size_bytes, mtime, width, height, availability, current_round_id, state, version)
- packages(id, player_id, requested_size, status, current_position, created_at, completed_at)
- review_rounds(id, photo_id, round_number, previous_outcome nullable, requested_by nullable, previous_judge nullable, reason nullable, status, created_at): unique round number per photo.
- package_items(id, package_id, round_id, position, assignment_status): unique active assignment per review round; retain released assignments as history.
- judgments(id, round_id UNIQUE, player_id, value, created_at): outcome of each round, not an independent personal vote.
- review_events(id, photo_id, round_id, actor_id, action, previous_state, new_state, request_id UNIQUE, created_at, reverses_event_id nullable): append-only audit history for judgments, return requests, releases, and undo.

Enable foreign keys; use parameterized SQL. Shared package allocation must atomically claim eligible pending review rounds and enforce one active assignment per round. Judgment, return-for-review, package completion, and undo updates must be atomic. Use idempotency keys and expected photo/round versions. Undo appends a compensating event and must reject attempts that conflict with later actions or assignments. Returning a judged photo creates one new pending round; preserve its previous judgment. Proposed reviewer eligibility excludes the previous judge and return requester, pending approval. Explicitly release unanswered assignments from abandoned packages; automatic expiry remains undecided.

## Proposed HTTP surface (illustrative, not an implementation contract)

- GET / : home / identity selection.
- GET /api/players?q=... : list/search known players and suggest similar usernames; return minimal identity metadata, never credentials.
- POST /api/players : explicitly create a player; normalized username uniqueness handles races.
- POST /session : explicitly choose an existing identity under the approved access model. Similar-name suggestions never merge identities automatically.
- POST /api/packages : allocate a package or return the existing unfinished one.
- GET /api/packages/<id> : ordered photos, decisions, and progress.
- PUT /api/photos/<id>/decision : like/dislike with idempotency and expected state.
- POST /api/undo : reverse the latest eligible decision event.
- GET /liked and GET /disliked : shared current outcomes and visible review history.
- POST /api/photos/<id>/return : request a new judgment round with expected version and optional reason.
- POST /api/packages/<id>/release : release unanswered assignments explicitly.
- GET /export.csv : shared current liked filenames/paths; exclude pending re-review photos by proposed policy.
- GET /photos/<id>/preview : controlled preview access.

Navigation does not imply a decision. Mutating routes use CSRF protection and enforce assignment ownership, active-round version, and reviewer eligibility. Shared galleries/export are intentionally shared among participants. The server derives the acting player from the session, not an arbitrary submitted player ID. Known-player autocomplete is identity discovery, not authentication; protect it appropriately if public deployment is selected.

## Deployment and data protection

- One server with durable local disk; do not use ephemeral-only storage for the database.
- Do not put SQLite on a shared network filesystem.
- Back up SQLite using its backup interface or a consistent stopped-server backup; do not assume copying an active DB file alone is sufficient.
- Keep a separate backup of originals. Previews can be regenerated.
- Restrict photo routes to indexed IDs; resolve paths under PHOTO_DIR and reject traversal, including symlinks escaping the root.
- Session signing secret is environment configuration, never committed.
- HTTPS and appropriate cookie flags for public deployment; access model must be approved first.
- Escape user-provided display names; validate package sizes, decision values, and input lengths.
- No automatic deletion of photos. Outcomes and review history are shared intentionally; credentials and session data are never exposed in the player directory.

## Sources consulted

- Flask SQLite pattern: https://flask.palletsprojects.com/en/stable/patterns/sqlite3/
- Flask database tutorial (including serialized-write limitation): https://flask.palletsprojects.com/en/stable/tutorial/database/
- Pillow orientation and resizing reference: https://pillow.readthedocs.io/en/stable/reference/ImageOps.html

## Unvalidated assumptions

One event and a shared workload with shared outcomes are confirmed. Modest simultaneous usage, supported formats, and durable local storage remain assumptions. Reviewer independence, reservation release, access model, and deployment need approval; benchmark rather than infer throughput.
