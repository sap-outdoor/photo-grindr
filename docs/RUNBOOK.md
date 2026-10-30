# Local runbook

## Current result

- Local app: http://localhost:5000 ; shared PIN: `2026`.
- Python/Flask + SQLite + Pillow + Waitress; plain browser JavaScript/CSS, no frontend build.
- Existing library indexed: 1,682 watermarked JPEGs. No source files moved or modified.
- Windows source root and approved subtrees are recorded in PHOTO_LIBRARY.md.
- Previews are generated lazily, EXIF-oriented, and cached; failed previews show an error rather than casting a vote.
- Real-library full decoding is not validated: one real preview was checked by the parent, and image edge cases use generated test fixtures.

## Windows setup and startup

Run from the repository root in Git Bash:

```bash
uv venv .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt
.venv/Scripts/python.exe app.py index
.venv/Scripts/python.exe app.py serve --port 5000
```

If the environment is already installed, only the last command is needed. Re-index after source-library changes; never replace the data directory to update the index. The server defaults to localhost, not public network access.

Normal foreground server shutdown: Ctrl+C. The initially supplied local server was started as a background process by the agent, so it does not have a foreground terminal prompt; ask the agent to stop it if needed. Do not start a second server on the same port.

## Persistent state

Windows default DATA_DIR is `data/` under this repository, excluded from Git:

- `review.sqlite3`: players, shared judgments, packages, audit and inactivity state.
- `secret.key`: random signing key; preserve privately with backups.
- Preview files: generated/cache data, safe to regenerate while the app is stopped.

Use PHOTO_DIR and DATA_DIR environment variables to override roots. Do not store mutable SQLite data inside OneDrive synchronization or on a network filesystem.

The shared PIN is only a casual gate. It is verified server-side; entry and selected player use signed browser state with CSRF checks. There are no individual passwords and no server-side login-session table. Anyone past the gate may select any player.

## Review behavior

- Default UI language is Czech; switch CS/EN live using the header button. Language choice persists without changing filenames, players, package state, or decisions.
- Choose/create a player; select 50, 100, or 250 photos, or resume active work.
- Decision mode shows only unanswered photos and a prominent remaining count. Arrows skip answered items; Undo brings the restored unanswered photo back. Like/Dislike and Undo/U only operate in decision mode, not home/gallery.
- Home puts package/player actions first. Instructions including the Tinder comparison are in collapsed Jak to funguje / How it works help.
- Gallery filters are Vybrané / Zamítnuté (Selected / Rejected). CSV export is in the gallery. Bulk controls appear when selecting photos; the general gallery Undo was removed. See UX_CLEANUP.md for verified geometry and scope.
- L / Like / right swipe records liked; D / Dislike / left swipe records disliked. Drag with a finger or mouse to move the photo directly; left/red and right/green edge feedback strengthens with distance and includes a text label. Short/cancelled gestures reset without voting. Eligible release holds its pose while saving, then continues outward from that exact pose after confirmation. Buttons/keys still toss from center. Reduced-motion preference keeps direct tracking but skips decorative rotation/toss. Navigation and Undo do not throw photos.
- Arrow keys, Previous/Next, and edge clicks navigate without votes. U / Undo reverses the latest eligible action.
- After 10 minutes without a player operation, unanswered assignments expire; saved judgments stay saved. Returning users receive a package-expired notice and can request fresh work.
- Passive polls/previews do not renew activity; all devices choosing the same player share the activity clock.
- Expiry never requires taking a replacement package before opening Explore, returning photos, or exporting CSV. The warning has a localized dismiss button and is remembered per player/expired package in tab sessionStorage; a new expiry warns again. Historical expiry does not redirect an open gallery.
- Entry and app footers show © 2026 Š&P Outdoor z.s. and a link to the GitHub repository.
- Shared galleries allow sending liked or disliked photos back for judgment. Anyone can receive them next. Returned photos are pending and excluded from current likes/CSV until judged again.
- CSV contains shared current liked filenames and portable relative paths. No photo/ZIP download feature is included.

## Verification performed

```bash
.venv/Scripts/python.exe -m pytest tests/test_backend.py -q --basetemp C:/Users/ondra/AppData/Local/hermes/cache/scratch/photo-grindr-parent-pytest
node --test static/app.test.cjs
node --check static/app.js
uv pip check --python .venv/Scripts/python.exe
```

Observed after expiry/Explore recovery and footer changes: 24 backend tests passed; 39 frontend/interaction tests passed after UX cleanup, paper-photo motion, and direct pointer dragging; syntax checks passed for app.js and i18n.js; installed dependencies compatible. Tests use generated fixtures and isolated databases, not event decisions.

Parent Chromium check on the running localhost server verified wrong/correct PIN flow; denied direct API, preview, and CSV access before entry; actual total 1,682; a real JPEG preview returned successfully; 390px mobile viewport without horizontal overflow; no page JavaScript errors. These parent checks did not create player identities or cast votes in event data.

Parent also executed a full Chromium journey against an isolated three-image fixture: Czech PIN error, player selection, allocation, decision, original-index navigation skipping answered photos, live English/Czech switching, Undo reinsertion, completion clearing the preview, shared gallery return, and CSV readback. Mobile review at 390px had no horizontal overflow and no page errors. After the controlled server restart, the actual localhost app was checked for Czech default, total 1,682, preserved shared outcomes, and a real JPEG preview without creating identities or voting in live data. Final targeted independent review passed with no security or logic blockers. The parent ran the complete 20-test Python suite; the reviewer independently reran 18 Python tests (excluding two CLI/server tests) and all 17 Node tests.

## Event-day operation and backups

Keep the photo tree and data directory between runs. Shutdown/restart never resets votes. Overdue assignments release on the next relevant request even after months offline.

Recommended shutdown backup procedure (not yet rehearsed):

1. Stop the server completely.
2. Copy the entire DATA_DIR to a private, dated backup location, including SQLite sidecars if present and secret.key. Do not copy a live SQLite database as if it were a consistent backup.
3. Preserve the existing watermarked photo files separately; no cloud re-download is needed.
4. Before the next event, restore/test a copy in a separate DATA_DIR and verify counts, previews, a scratch review/undo, CSV, and expiry before reopening real data.

For a different event, use a separate PHOTO_DIR/DATA_DIR rather than deleting the current event history. Multi-event administration is not part of this MVP.

## Linux LXC deployment (not yet exercised)

- Chosen PHOTO_DIR: `/srv/photo-grindr/photos/`; preserve both photographer/watermarked relative subtrees.
- Chosen DATA_DIR: `/var/lib/photo-grindr/`; application user needs write access there, only read access to photos.
- Install a compatible Python, create `.venv`, install requirements, set PHOTO_DIR and DATA_DIR, then use `.venv/bin/python app.py index` and `.venv/bin/python app.py serve --host 127.0.0.1 --port 5000`.
- Reverse proxy/network access, HTTPS, service startup and container photo mount depend on the actual LXC environment. Do not claim these are deployed or tested yet.
