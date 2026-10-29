# Photo Grindr

A proposed web app for reviewing sports-event photos in manageable batches.

## Status

Planning only. No application code or dependencies have been installed. Product and architecture choices below are proposals pending approval.

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

Not available yet. Implementation starts after agreement on the plan.
