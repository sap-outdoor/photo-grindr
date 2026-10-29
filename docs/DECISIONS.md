# Confirmed decisions and proposed edge-case behavior

This records product decisions, not an implementation report.

## Shared entry gate

- One static PIN: `2026`, validated server-side.
- No individual accounts/passwords; select a player after the gate.
- A signed browser cookie remembers successful entry and selected player. This is minimal browser state, not a database-backed session system.
- Gate application pages/data APIs/previews/CSV; do not implement a client-only overlay.
- PIN is intentionally predictable; do not claim strong security. Deployment signing secret remains separate, random, and uncommitted.

## Shared queue

- One active assignment per photo review round.
- Anyone can receive returned photos, including the previous judge and requester.
- Ten minutes without a player operation releases their unanswered reservations only; existing likes/dislikes remain saved.
- Activity is per player across devices, stored as server UTC last_action_at; not per browser/session.

### Proposed operational interpretation

- Accepted user operations update activity: navigation, package selection/resume, judgments, undo, gallery interaction, return requests, and export.
- Passive polls, preview requests/preloading, or an unattended heartbeat do not update it. Merely leaving a tab open must not reserve work forever.
- Check expiry before recording the next operation. At/after the deadline, expire the old assignments first; late writes cannot silently renew them or take work back from another player.
- Release and next claim run transactionally. Cleanup at allocation/resume/write time is enough for availability; no cron/background scheduler is required.
- A returning player sees that the old package expired and can request a new one. Historical progress remains visible, but released work is no longer theirs.
- Long passive inspection can exceed the timeout. Explain this in the UI rather than silently accepting a stale vote; keep the agreed 10-minute limit unless changed explicitly.
- Expiry affects old assignments only: allow Explore/activity/CSV/return requests immediately, without requiring a replacement package or acknowledgment.
- Show a dismissible warning once per player/expired-package identity in the browser tab; do not let historical expiry bounce users out of galleries after refresh. Reject writes to the expired package as before.

## Photo placement and export

- Only watermarked images, now and later.
- Linux photo root `/srv/photo-grindr/photos/`; mutable database/cache `/var/lib/photo-grindr/`.
- Preserve photographer/watermarked relative paths for portability and CSV selection.
- Windows development reads the approved existing source folders without copies or cloud downloads.
- No photo-download/ZIP feature. CSV is consumed by a separate local script.

## Confirmed event-day lifecycle

- Intended to run for a day, then possibly again around half a year later; keep deployment and maintenance proportionate.
- Explicit package-expired notification is approved. Offer a fresh package; preserve saved judgments.
- No required scheduler or always-on auxiliary service. Request-time cleanup handles inactivity, including after downtime.
- Persist SQLite and photos between runs. Document stopped-app backup, restore, and a short smoke test before reopening.
- No automatic reset on restart and no multi-event management feature in this MVP.

## Confirmed Czech-first focused review

- Czech default with optional English and persisted language preference.
- Large remaining-unanswered count on the decision screen.
- Decision-screen navigation skips answered photos; undo restores the affected unanswered photo.
- Liked/disliked galleries still show current shared outcomes for checking and return requests.

## Still proposed

- Returned photos become pending and leave current liked/disliked sets and liked CSV until rejudged.
- Returned-first, stable filename ordering.
- Basic entry-attempt throttling and cookie lifetime selected during implementation.

## References

Flask signed cookie state: https://flask.palletsprojects.com/en/stable/quickstart/#sessions
Flask cookie/CSRF considerations: https://flask.palletsprojects.com/en/stable/web-security/
