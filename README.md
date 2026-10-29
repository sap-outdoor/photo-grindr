# Photo Grindr

A proposed web app for reviewing sports-event photos in manageable batches.

## Status

Planning only. No application code or dependencies have been installed. Product and architecture choices below are proposals pending approval.

## Objective

Let players review approximately 1,600 server-local photos (approximately 1.5 GB), save personal like/dislike decisions, revisit liked photos, and export their selected filenames as CSV.

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
