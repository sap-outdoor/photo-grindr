# Product requirements

Status: proposal pending discussion.

## Confirmed request

- Browser-based application for approximately 1,600 sports-event photos, approximately 1.5 GB, already stored on the server.
- Enter player name / username on the home screen.
- Choose a package size, including 50, 100, or 250 photos.
- Review one photo at a time with left/right swipes, similar to a dating-app card interface.
- Click the left/right sides of the image to go to the previous/next image.
- Provide undo.
- Persist liked and disliked decisions in a database.
- Return home after a package, choose another, inspect liked photos, and download a CSV of liked filenames.
- Initialize Git, document the project in Markdown, and agree the plan before full implementation.

## Proposed MVP behavior

### Identity and home

- Display name and unique username are separate concepts; username identifies the review owner.
- Trim usernames and compare them case-insensitively; keep their display spelling.
- Show counts for unseen, liked, and disliked photos, plus unfinished-package progress.
- Offer package sizes 50 / 100 / 250, resume unfinished package, liked gallery, and CSV export.
- Allow a final package smaller than the requested size when fewer photos remain.
- When no unseen photos remain, show completion rather than an empty package.

### Package allocation

- Each player reviews independently: different players can receive the same photo.
- A new package contains only that player's unreviewed photos not already in an unfinished package.
- Use stable filename order initially; random order is an optional alternative.
- Persist package membership and order; refreshing or returning later does not reshuffle it.
- Default to one unfinished package per player and resume it before creating another.
- Mark completion only when every photo in the package has a decision, not merely when the last photo is visited.
- Permit return home early without losing progress.

### Review interactions

- Swipe right = like; swipe left = dislike. A committed decision advances to the next unresolved photo.
- Provide explicit Like and Dislike buttons; swipes are not the only way to decide.
- Click/tap the left edge = previous photo; right edge = next photo. Navigation does not record or change a decision.
- A drag that becomes a swipe must not also trigger an edge click.
- Show filename, package position, saved decision, and answered/total count.
- Provide Previous / Next navigation controls, including keyboard-accessible buttons.
- Undo restores the preceding decision state and returns to the affected photo; undo is not simply Previous.
- Support undoing multiple decisions, including changes to an existing decision. Keep undo history across refreshes.
- Clearly show saving/error state; failed saves must not be presented as successful decisions. Retry without duplicate history entries.
- Broken/missing photos display an error with retry and navigation; do not silently mark them disliked.

### Liked-photo review and export

- Show a gallery of all photos currently liked by the active player, across all packages.
- Open a liked photo for a larger view and change its decision; default proposed action is Unlike (set to disliked).
- CSV represents current likes, not historical likes, and is limited to the active player.
- Proposed CSV columns: filename, relative_path. Include a header and correct escaping/Unicode handling.
- Relative path disambiguates identical basenames in different directories; never expose absolute server paths.
- Protect spreadsheet exports against formula injection while documenting any necessary escaping.
- No selection of original-photo downloads or ZIP export in the MVP.

## Security decision required

Username-only access is convenient but is not authentication. Someone who knows another username could view or change that player's selections. It is acceptable only for an explicitly trusted/private deployment. Before public deployment choose a PIN, personal access link, or real login; enforce owner isolation server-side. A name entered into a form is not proof of identity.

## Acceptance criteria for implementation

- Two players' decisions and exports remain independent.
- Choosing each supported package size returns the requested count or the remaining smaller count, without duplicates or prior decisions for that player.
- Reloading and restarting the server preserves identity association, package order, progress, and decisions.
- Swiping, buttons, edge navigation, and undo follow their distinct semantics on touch and mouse.
- A completed package returns the player home; unfinished packages can be resumed.
- CSV matches the player's current liked set, including changes and undo, with correct filename/path handling.
- Photos retain aspect ratio and correct orientation; originals are unchanged.
- Empty libraries, exhausted libraries, missing photos, corrupt images, save failures, and duplicate basenames are handled explicitly.
- Photo bytes and database contents are excluded from Git.
- Performance is measured against the actual library before claiming readiness for all 1,600 photos.

## Questions to settle before implementation

1. Is this private/trusted access with username only, or should we add a PIN/personal access link?
2. Confirm independent personal selection (not dividing a shared workload across players).
3. Confirm swipes decide while side clicks only navigate, with explicit Like/Dislike buttons as well.
4. Where will this run (Windows/Linux, home/LAN/public server), and what photo folder/formats will be used?
5. Is stable filename order acceptable, or should each player's packages be randomized?

## Out of scope initially

Face recognition, player detection, AI ranking, browser uploads, editing/deleting originals, multiple events, photo ZIP downloads, leaderboards, moderation dashboards, and horizontal multi-server scaling.
