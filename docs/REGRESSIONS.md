# Regression coverage

## Expired last package must not block Explore

Reported scenario: the last package is expired, the user sees the home warning, clicks Prohlížet/Explore, and remains stuck on the home screen.

Root causes:

1. Explore calls POST /api/activity before loading the gallery. General activity incorrectly rejected users whose latest package was expired, unless they had first attempted another allocation.
2. Frontend refresh unconditionally navigated home whenever state.expired was true, including gallery refresh after returning a photo.

Fix:

- General player activity updates last_action without reviving assignments. Expired-package-specific operations still fail through owned_package; stale votes/navigation/undo are not allowed.
- State identifies the specific expired package using expired_package_id.
- Historical expiry no longer redirects an open gallery. Real expiry discovered during review still exits stale work safely.
- Warning has an accessible CS/EN dismiss control; dismissal is remembered per player/package in sessionStorage. No automatic timeout hides errors or unresolved Undo warnings.

Tests:

- tests/test_expired_browsing.py reproduces expiry -> activity -> gallery -> CSV -> return, with no allocation in between; stale package writes remain HTTP 409.
- static/app.test.cjs exercises actual frontend events for direct Explore, gallery refresh/return, per-player/package dismissal, fresh expiry, and Undo refresh preserving the warning.
- Existing expiry tests were corrected: generic activity is HTTP 200 even after expiry; stale package actions remain blocked.
- Parent observed new tests fail before implementation, then ran the full suite: 24 Python tests and 22 Node tests passed.
- Real Chromium against an isolated fixture also passed expiry -> dismiss -> Explore without allocation -> CSV -> return -> gallery stays open -> reload without repeated warning. No live event data was modified by regression tests.

## Footer and instructions

- tests/test_footer.py checks copyright and repository links on entry/application pages in Czech and English.
- Existing dictionary/template checks validate the bilingual Tinder comparison and preserve gesture meanings: right likes, left dislikes, edge taps only navigate.

## Runtime verification

After a controlled restart, localhost:5000 served the updated backend state field, footer, and Tinder copy. Live library total remained 1,682. Tests deliberately use isolated databases; no automatic data resets or source-photo writes are included.
