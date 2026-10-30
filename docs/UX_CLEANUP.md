# UX cleanup: working tool, not a presentation site

Status: implemented, parent-tested in Chromium, and running on localhost after a controlled restart. Independent targeted code review passed without blockers; no production Linux deployment performed.

## Product goal

Reduce friction in the shared workflow: select player -> take/resume package -> judge photos -> correct mistakes -> inspect shared results/export CSV. Primary surface: Operate. Secondary surface: Explore. Preserve the existing pastel palette and neutral photo surround; this is not a new visual identity or backend rewrite.

## Decisions

- Remove decorative hero slogans, edition badge/circle, numbered section eyebrows, and oversized statistics.
- Put identity, resume/package choices, and compact real queue counts first.
- Move the existing instructions (including the user-requested Tinder comparison and inactivity explanation) under a collapsed, keyboard-accessible How it works/Jak to funguje disclosure.
- Simplify PIN entry to an actual entry form rather than an editorial landing page.
- In review, prioritize the image, remaining-unanswered count, Like/Dislike, Undo, and navigation. Keep filenames and paths available as secondary information without dominating layout.
- Replace the large routine decision-saved notification with compact accessible status. Keep persistent errors, conflicts, expiry, and unresolved-save/Undo information visible.
- Gallery filters use nouns Selected/Rejected (Vybrané/Zamítnuté), not the same verbs used for voting.
- No global Undo control in the gallery. U only acts in review; it must not unexpectedly undo a previous judgment from the home or gallery screen.
- Preserve gallery selection, confirmation, return for review, and one clear shared-liked CSV export action. Hide bulk-action clutter when nothing is selected.
- Retain the copyright/GitHub footer without giving it decision-screen prominence.

## Invariants

- No photo source edits, live-event resets, decision migrations, or new dependencies.
- No changes to shared outcome semantics, package allocation, activity expiry, or CSV content.
- Pending-only navigation preserves original server indices. Undo reintroduces the restored pending image.
- Unresolved Undo retains its idempotency payload and prevents ambiguous intervening actions.
- Historical expiry cannot block browsing/export or redirect galleries; its dismissible warning remains per player/package.
- Czech default and optional live English, usernames/paths unchanged, existing CS/EN text preserved where still needed.
- Decision controls never become visible or actionable in gallery mode.

## Acceptance and measurement

Capture baseline and final screenshots/geometry against generated isolated fixtures, not live event votes:

- Desktop: 1366 x 768. Mobile: 390 x 844.
- Record review image-stage height and primary-action bottom position, and where primary home controls appear.
- On those viewport sizes, review decision actions must be visible without document scrolling; images preserve aspect ratio.
- No horizontal document overflow. Touch targets remain at least 44px for primary controls; keep focus states and avoid obscuring focused controls.
- Verify actual decision, pending navigation, Undo retry, completion, gallery filters, selection/return, and CSV flows.
- Confirm U has no mutation effect in home/gallery and remains functional in review.
- Run full backend and frontend suites before claiming completion. Report measured results and any limits rather than asserting user-speed improvements without a user study.

Screenshots remain in scratch storage, not Git. The photo-library source and event database are excluded from all destructive tests.

## Observed results

Parent reran the full backend suite with third-party pytest plugin autoload disabled: 24 passed. Frontend suite: 26 passed. Syntax and whitespace checks passed.

Parent executed the isolated Chromium journey: PIN, keyboard expansion of collapsed help, CS/EN switch, decisions/pending navigation, Undo, completion, selected/rejected galleries, no U mutation from home/gallery, individual and bulk return, CSV, portrait contain-fit, long filenames, and 44px primary targets. No horizontal overflow or page JavaScript errors.

| Parent-verified geometry | Desktop 1366 x 768 | Mobile 390 x 844 |
| --- | ---: | ---: |
| Home package controls top | 284.1px | 316.2px |
| Home package controls bottom | 416.3px | 453.6px |
| Review stage height | 448.6px | 493.9px |
| Review primary actions bottom | 697.1px | 776.5px |

Primary review actions fit inside both tested viewports without scrolling. The stage occupies more than half the viewport height on both. This is geometry verification, not a measured productivity improvement or a physical-device/Safari test.

Baseline screenshots and after screenshots are stored only under Hermes scratch storage. Parent visually inspected desktop home and mobile review screenshots. After restart, the live localhost app was verified for the collapsed help, removed gallery Undo, new filter labels, absent edition badge, and unchanged 1,682-photo library total without creating test players or votes in live data.

## Paper-photo decision motion

Status: implemented and parent-verified. Localhost serves byte-identical updated JS/CSS; targeted independent review passed without blockers.

- Successful Like/Dislike throws a translucent copy of the previous photo toward the selected side, with a small rotation, paper edge, and shadow.
- Motion is feedback for a confirmed save, never a substitute for server confirmation. Failed/expired/conflicting requests do not produce a successful toss.
- Edge taps, Previous/Next, Undo, and gallery actions do not throw photos.
- The next pending photo and count may update immediately after a successful save; do not delay the API request or await decorative motion before enabling work.
- The throwaway copy is hidden from assistive technology, has no duplicate ID, cannot intercept input, stays in a clipped viewport layer, and is removed after completion/cancellation or leaving review.
- Respect prefers-reduced-motion and retain correct saving/navigation without animation support.
- Verified in isolated real Chromium: successful right/left directions, delayed server confirmation, no toss on HTTP 503/409, portrait geometry, reduced motion, cancellation cleanup, last-photo completion, and no desktop/mobile overflow.
- Actual effect: 250ms, mirrored ±10-degree rotation, opacity .85 to 0. It also applies consistently to Like/Dislike buttons and L/D shortcuts.
- Parent reran 24 Python tests and 32 Node tests, JS syntax and whitespace checks. Mobile actions bottom remained 776.47px inside an 844px viewport. No page errors. Live event data was not used for destructive tests.

## Direct pointer drag and progressive decision lighting

Status: implemented and parent-tested with generated isolated fixtures; localhost asset verification and independent review are recorded below.

- On mouse/touch pickup, the photo copy follows the active primary pointer; signed horizontal distance controls translation and bounded decorative rotation.
- Left/red means Dislike, right/green means Like. Light only the stage surround and show a localized direction label; do not recolor the source photograph or rely on color alone.
- Glow intensity increases continuously with distance and is clamped. No decision or database write occurs on pointer movement.
- Preserve short edge taps for navigation and the existing horizontal swipe threshold. Short/vertical/cancelled gestures restore the photo without deciding.
- On eligible release, hold the release pose while saving and continue the throw from that same pose only after server confirmation. Failed saves restore visuals and retain normal error/expiry behavior.
- Handle pointercancel, lostpointercapture, Escape, secondary pointers, navigation, and rapid input without orphaned overlays or duplicate votes. Vertical touch panning remains available.
- Keep buttons and keyboard alternatives. Under reduced motion, direct input tracking can remain, but skip decorative rotation, throw, and snap-back easing.
- Parent reran 24 backend and 39 frontend tests. Isolated Chromium passed real mouse and CDP touch, deferred-save release continuity, 503/409/network failures, vertical pan cancellation, reduced motion, final-photo completion, and no overflow or page errors.
- Visual review caught two issues before delivery: lighting must be directional rather than surround-wide, and must remain visible above the moving copy. Extended regressions failed first, then passed after a side-signed edge-light overlay was added. The glow is clipped to the stage edge; no image color filter is applied.
- Release pose was verified at animation time zero: translate(105px, 7px) rotate(3.5deg), with identical geometry before and after server confirmation.
- Browser tests use generated isolated fixtures, never live event votes. Independent main-interaction and edge-light reviews both passed without blockers; live JS/CSS were verified byte-identical to the tested files.

References: W3C Pointer Events https://www.w3.org/TR/pointerevents3/ ; WCAG use of color https://www.w3.org/WAI/WCAG22/Understanding/use-of-color ; dragging alternatives https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements . These guide implementation, not a blanket accessibility-conformance claim.

## Basis

- Nielsen Norman Group, Aesthetic and Minimalist Design: https://www.nngroup.com/articles/aesthetic-minimalist-design/ — retain information serving the task and disclose secondary help on demand.
- Nielsen Norman Group, Visibility of System Status: https://www.nngroup.com/articles/visibility-system-status/ — reduce distracting feedback without hiding save/error state.
- W3C, Target Size Minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum — compact layouts must not produce hard-to-hit controls.
- W3C, Focus Not Obscured: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum — viewport-fit/sticky controls must not conceal keyboard focus.

These are design principles, not a claim of whole-application WCAG conformance or measured productivity gains.
