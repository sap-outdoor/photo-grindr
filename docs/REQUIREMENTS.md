# Product requirements

Status: planning only. Confirmed requirements and proposed defaults below are distinct; application implementation awaits approval.

## Confirmed requirements

- Web app for approximately 1,600 server-local sports photos (approximately 1.5 GB).
- Shared workload: players divide a common library, rather than each reviewing every photo independently.
- Show known players. Username input autocompletes existing players and suggests similar names to avoid duplicate identities.
- Choose review packages of 50, 100, or 250 photos.
- Review one photo at a time; swipe left/right for dislike/like; click image sides for previous/next navigation; provide undo.
- Persist decisions in a database; return home to select another package, review selections, and export liked filenames as CSV.
- Other players can inspect both liked and disliked photos and send them back for judgment: checks and balances.
- Document in Markdown and agree the plan before full development.

## Proposed identity behavior

- Home offers a known-player list and searchable username field; explicitly selecting a suggestion resumes that identity.
- Compare exact usernames after trimming and case-insensitive normalization; preserve display spelling.
- Before creating a new identity, show likely similar existing names with a prompt such as "Did you mean this player?"
- Never silently merge similar names or switch identity based on fuzzy matches.
- Exact normalized matches reuse the existing identity, not a duplicate. Enforce uniqueness server-side, including concurrent requests.
- Show the active player prominently with an explicit switch-player control.
- Known-player selection is not authentication. Choose trusted private access or PIN/access-link/login protection before deployment.

## Proposed shared allocation

- Home shows shared awaiting-judgment, assigned/in-progress, liked, and disliked counts, plus personal package progress.
- A photo's current review round has at most one active assignment. Allocate transactionally to avoid duplicate work.
- Persist package membership/order; default to one unfinished package per player and resume it first.
- Permit smaller final packages and distinguish an empty queue from work reserved by others.
- Prioritize returned photos, then untouched photos; use stable filename order within each group.
- Leaving early preserves progress. Provide explicit release of unanswered assignments; automatic reservation expiry remains undecided.

## Proposed checks-and-balances workflow

- Each photo has a shared current outcome: pending, liked, or disliked; assignment status is separate.
- Record the deciding player, review round, and history for each judgment.
- Shared liked and disliked galleries both offer Send back for review, individually or for a selected set; optional reason proposed.
- Returning a photo starts a new pending review round, rather than directly flipping the old verdict. Preserve all earlier judgments.
- Proposed default: pending re-review photos leave the current liked/disliked sets and liked CSV until judged again.
- Proposed default: the next reviewer differs from both the previous judge and the return requester. Keep photos pending if no eligible reviewer is available; no silent fallback. This rule requires confirmation.
- Repeated requests must not create duplicate review rounds or assignments.
- Re-review can confirm or change the previous verdict. No majority voting or mandatory second approval unless separately agreed.

## Proposed interactions and undo

- Swipes and explicit Like/Dislike buttons decide; edge clicks and Previous/Next controls only navigate.
- Prevent a swipe from also triggering an edge click. Provide keyboard-accessible controls.
- Show filename, position, answered/total count, saved state, and saving/errors.
- Complete a package only when every active item is resolved or explicitly released, not merely visited.
- Undo reverses the player's latest eligible action, restores prior state, and returns to the affected photo. Persist history across refreshes.
- Undo must not overwrite another player's later action or reopen an obsolete round; show a conflict instead.
- Proposed: return requests can also be undone before any later assignment/action depends on them.
- Retries are idempotent. Missing/corrupt photos show an error, never an automatic dislike.

## Proposed export and photo handling

- CSV exports the shared current liked set, not personal likes or historical judgments.
- Columns: filename, relative_path; handle CSV escaping, Unicode, and spreadsheet formula injection.
- Relative paths disambiguate duplicate basenames without revealing absolute server paths.
- Preserve original files, aspect ratio, and orientation; generate smaller review previews.
- No original-photo download/ZIP export in MVP.

## Access model

Shared galleries/history are intentionally visible to participants. Active assignment and mutation permissions still require server-side checks. Username-only entry means someone can select another player's identity; attribution depends on trust. Use PINs, personal links, or login if that is unacceptable. Autocomplete never exposes credentials.

## Acceptance criteria

- Known-player list, exact-name autocomplete, and similar-name suggestions avoid duplicates without silent merging.
- Simultaneous allocation never assigns the same review round twice; all package sizes, smaller final packages, empty and reserved-only queues work.
- Shared likes/dislikes are visible to other players; export reflects current shared likes.
- Either a liked or disliked photo can be returned exactly once per active round, preserving history and following approved reviewer eligibility.
- Restart/refresh preserves packages, decisions, return requests, and undo history.
- Stale browser actions and undo cannot overwrite newer rounds or other players' work.
- Touch/mouse navigation remains distinct from decisions; retries/errors are explicit.
- Missing/corrupt photos and duplicate basenames are handled; originals remain unchanged.
- Keep photos, generated previews, databases, and secrets out of Git.
- Measure real-library performance before claiming readiness.

## Questions before implementation

1. Trusted private name selection, or protected identities via PIN/access link/login?
2. Must a re-reviewer differ from both previous judge and requester, or only from the previous judge?
3. Confirm pending re-review removes the photo from current likes/dislikes and liked CSV until judged again.
4. Deployment OS, LAN/public access, photo directory/formats, and expected simultaneous players?
5. Is returned-first filename ordering acceptable, and how should abandoned reservations be released?

## Out of scope initially

Face recognition, AI ranking, uploads, original editing/deletion, multiple events, ZIP downloads, leaderboards, majority voting, and multi-server scaling.
