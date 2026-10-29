# Proposed architecture

Status: proposed, not implemented. Dependency versions will be checked, pinned, and tested at implementation time.

## Stack and rationale

- Python + Flask: one server renders pages and provides small JSON endpoints.
- HTML/CSS + vanilla JavaScript: responsive photo-review UI and pointer gestures, without a frontend build chain.
- SQLite through Python's sqlite3: persisted players, packages, decisions, and undo history in one local file.
- Pillow: generate appropriately sized previews with EXIF orientation correction.
- Production target: Linux LXC on Proxmox; development/testing on Windows. Select and verify a production WSGI server during implementation; never expose the development server as production.

This is a proposal to minimize moving parts, not a claim that production performance has been validated. SQLite serializes writes, so transactions must stay short and concurrent-write behavior must be tested.

## Storage layout

- Configured PHOTO_DIR: existing library root outside Git, read-only to the app. Index only the two explicit watermarked subtrees documented in PHOTO_LIBRARY.md. Use portable relative paths, not Windows drive letters, as stored image identifiers.
- Configured DATA_DIR: SQLite database and generated previews, outside Git.
- Example local names data/ and photos/ are ignored as a safety net; real paths are configuration.
- Database contains metadata and decisions, not image blobs.
- Build previews during an explicit import/index command, not during the first swipe.
- Serve previews for reviewing; no original-photo download or ZIP endpoint. The only export is CSV for an external local selection script. Reading source files for previews is not authorization to copy or re-download the library.
- Preload only a small number of next images, not the whole library.

## Import/index policy

- The inspected source contains JPEGs only. Implement JPEG support first; additional formats are not required for the current library. Validate actual decoding during the approved importer stage, not metadata discovery.
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

Enable foreign keys; use parameterized SQL. Shared package allocation must atomically claim eligible pending review rounds and enforce one active assignment per round. Judgment, return-for-review, package completion, and undo updates must be atomic. Use idempotency keys and expected photo/round versions. Undo appends a compensating event and must reject attempts that conflict with later actions or assignments. Returning a judged photo creates one new pending round; preserve its previous judgment. Confirmed: any player is eligible for a returned round, including the previous judge and requester; do not implement actor-based exclusion filters. Explicitly release unanswered assignments from abandoned packages; automatic expiry remains undecided.

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

Navigation does not imply a decision. Mutating routes use CSRF protection and enforce assignment ownership and active-round version. No identity-based reviewer exclusions apply. Shared galleries/export are intentionally shared among participants. The server derives the acting player from the session, not an arbitrary submitted player ID. Confirmed: no password protection. Known-player autocomplete is identity discovery only; recommend a private network/VPN boundary, and explicitly flag the risk before public exposure.

## Deployment and data protection

- One server with durable local disk; do not use ephemeral-only storage for the database.
- Do not put SQLite on a shared network filesystem.
- Back up SQLite using its backup interface or a consistent stopped-server backup; do not assume copying an active DB file alone is sufficient.
- Keep a separate backup of originals. Previews can be regenerated.
- Restrict photo routes to indexed IDs; resolve paths under PHOTO_DIR and reject traversal, including symlinks escaping the root.
- Session signing secret is environment configuration, never committed.
- No application passwords for now. Recommend private network/VPN access; public exposure requires acknowledging that anybody can select identities, change outcomes, and view event photos. Use HTTPS and appropriate cookies if exposed beyond localhost.
- Escape user-provided display names; validate package sizes, decision values, and input lengths.
- No automatic deletion of photos. Outcomes and review history are shared intentionally; credentials and session data are never exposed in the player directory.

## Sources consulted

- Flask SQLite pattern: https://flask.palletsprojects.com/en/stable/patterns/sqlite3/
- Flask database tutorial (including serialized-write limitation): https://flask.palletsprojects.com/en/stable/tutorial/database/
- Pillow orientation and resizing reference: https://pillow.readthedocs.io/en/stable/reference/ImageOps.html

## Unvalidated assumptions

Confirmed: shared workload, unrestricted re-reviewer eligibility, no passwords, Windows development, Linux LXC production, and two watermarked JPEG subtrees. Simultaneous usage, Linux photo mount/transfer, reservation release, and pending-export policy still need confirmation. Benchmark actual decoding/performance later; metadata inventory is not image validation.
