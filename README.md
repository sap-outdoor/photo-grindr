# Photo Grindr

A proposed web app for reviewing sports-event photos in manageable batches.

## Status

Planning only. No application code or dependencies have been installed. Product and architecture choices below are proposals pending approval.

## Objective

Divide approximately 1,600 server-local photos (approximately 1.5 GB) among players as a shared workload. Maintain shared like/dislike outcomes, allow other players to return either outcome for fresh judgment, and export the current shared liked filenames as CSV. Offer known-player selection and username autocomplete to avoid duplicate identities.

## Planning documents

- [Product requirements](docs/REQUIREMENTS.md): screens, interactions, behavior, acceptance criteria, and questions.
- [Architecture](docs/ARCHITECTURE.md): proposed stack, storage, data model, API, security, and operations.
- [Implementation plan](docs/PLAN.md): staged delivery and verification gates.

## Proposed technology

Python + Flask, SQLite, HTML/CSS and vanilla JavaScript, Pillow for previews. A single application and local persistent storage; no separate database service or frontend build pipeline in the initial design.

## Repository rules

- Never commit original photos, generated previews, database files, credentials, or local environment files.
- Preserve originals: review decisions change database records, never source images.
- Document approved changes and setup/run/test commands as they become real.
- Do not treat planned behavior as implemented or tested.

## Running

Not available yet. Implementation starts after agreement on the plan.
