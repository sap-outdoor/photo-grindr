# Visual direction

## Reference and scope

User requested colors inspired by https://trailmaniacs.cz, softened toward pastels rather than copying the site. Direct browser inspection found navy `#00507e`, yellow `#ffd400`, cream `#f7f6f1`, and charcoal `#12161a` in computed styles.

This app is primarily an Operate surface (rapid photo decisions), with secondary Explore galleries. Keep actions and remaining-work count legible; no new marketing content or copied logos/assets/layout.

## Proposed softened palette

| Role | Color |
| --- | --- |
| Primary ink / navy | #244a63 |
| Page / warm off-white | #f8f6ef |
| Powder-blue surface | #dceaf1 |
| Butter-yellow primary accent | #f4dfa0 |
| Neutral photo stage | #202327 |
| Like text / sage surface | #28513e / #dcebdc |
| Dislike text / dusty rose surface | #7a3540 / #f3dfe2 |

Keep the photo stage neutral, not blue/yellow tinted, so the surround does not unnecessarily bias perceived photo color. Brand palette and decision semantics are separate: yellow is an emphasis/action color, not a Like/Dislike meaning. Remaining count should dominate progress copy, using navy on butter yellow.

## Contrast precheck

Computed using sRGB relative luminance and WCAG contrast formula (tool execution):

- Navy on off-white: 8.69:1.
- Navy on butter yellow: 7.12:1.
- Navy on powder blue: 7.64:1.
- Green text on sage: 7.26:1.
- Dark red text on pale rose: 6.83:1.

These planned pairs exceed 4.5:1 for normal text. Verify actual rendered text/background pairs, focus states, desktop/mobile layout, and photo review after implementation; this palette calculation alone is not a whole-app accessibility claim.
