# Photo Grindr

A proposed web app for reviewing sports-event photos in manageable batches.

## Status

Initial local version implemented and running on http://localhost:5000 (shared PIN: 2026). Backend and interaction tests pass; PIN flow, protected routes, a real photo preview, and mobile layout were checked in Chromium. Czech is the default language with a live CS/EN switch. Review skips answered photos and prominently shows the remaining count; the palette is a pastel navy/yellow interpretation of Trail Maniacs. Final targeted independent code review passed with no blockers.

## Objective

Divide 1,682 existing watermarked JPEG photos (1,233,067,582 bytes observed during metadata inspection) among players as a shared workload. Maintain shared like/dislike outcomes, allow other players to return either outcome for fresh judgment, and export the current shared liked filenames as CSV. Offer known-player selection and username autocomplete to avoid duplicate identities.

## Planning documents

- [Product requirements](docs/REQUIREMENTS.md): screens, interactions, behavior, acceptance criteria, and questions.
- [Architecture](docs/ARCHITECTURE.md): proposed stack, storage, data model, API, security, and operations.
- [Implementation plan](docs/PLAN.md): staged delivery and verification gates.
- [Decisions](docs/DECISIONS.md): entry PIN, activity expiry, and edge-case behavior.

## Proposed technology

Python + Flask, SQLite, HTML/CSS and vanilla JavaScript, Pillow for previews. A single application and local persistent storage; no separate database service or frontend build pipeline in the initial design.

## Confirmed operating constraints

- Shared entry PIN: `2026`, verified server-side before accessing application data or images. No individual passwords; player selection remains trust-based attribution.
- Any player may judge a returned photo, including its previous judge or the person who returned it.
- Development/testing: Windows. Production: Linux LXC on Proxmox.
- Watermarked images only. Linux photo root: `/srv/photo-grindr/photos/`; Windows development reads the existing approved subtrees without copying. See [photo library](docs/PHOTO_LIBRARY.md).
- Release only unanswered reservations after 10 minutes without a player action; keep saved judgments. Track activity per player, not per login session.
- CSV is the deliverable for a separate local selection script; no photo-download or ZIP feature.
- Challenge assumptions and flag trade-offs rather than silently expanding scope.

## Repository rules

- Never commit original photos, generated previews, database files, credentials, or local environment files.
- Preserve originals: review decisions change database records, never source images.
- Document approved changes and setup/run/test commands as they become real.
- Do not treat planned behavior as implemented or tested.

## Running

See [runbook](docs/RUNBOOK.md) for setup, start/stop, configuration, and backups.

Windows quick start (from this directory):

```bash
uv venv .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt
.venv/Scripts/python.exe app.py index
.venv/Scripts/python.exe app.py serve --port 5000
```

Open http://localhost:5000 and enter the shared PIN `2026`. The index command reads metadata from the existing approved folders; previews are generated and cached when viewed. Existing judgments are retained across restarts.
