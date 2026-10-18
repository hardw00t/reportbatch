# Keyboard and narrow-window QA supplement

2026-10-18, 17:46–17:49 UTC. Public preview URL unchanged. Browser-observed asset: index-DJAwKvp4.js. Dot's cloud Chrome only; no user computer, uploads, file chooser, or authentication changes.

## Confirmed actionable issue
Two visually hidden file inputs remain in sequential keyboard order: Choose PDF batch and Import layout preset. On the landing page after skip-link activation, Tab focused Choose PDF batch; next Tab focused Import layout preset before reaching visible Choose a PDF. Each hidden focused input had a 2×2px rectangle at x=-1,y=-1, and its computed3px outline was clipped and invisible. This adds confusing invisible focus stops. Same hidden stops occur after cycling workbench controls. Recommend tabindex=-1 on hidden proxy file inputs, with visible labeled buttons retained as keyboard entry points. Do not remove accessible names from visible buttons.
Evidence: invisible-focus.jpg; keyboard-trail-landing.json; keyboard-trail-workbench.json.

## Verified
- Resized native cloud Chrome using visible window border, not an invented browser emulation API. Browser minimum window limited further narrowing. Landing document width485px; workbench reported500px (scrollbar/viewport variation). Native window restored afterward.
- Landing reflows to one column. Narrow workbench review and correction panel stack vertically. No document overflow at measured widths: scrollWidth equals clientWidth; DOM bounds scan found no elements beyond right viewport edge in review state.
- Visually inspected narrow landing and review screenshot; Review003 focus ring visible and content readable. Tiny helper/table text is a usability concern on narrow desktop, but no clipping defect established.
- Traversed42 workbench Tab stops across page navigation, extracted-text disclosure, Fields/Split/Names, field selectors, extraction select, prefix, draw control, numeric region inputs, layout/preset actions, preflight, issue filter, reviews, corrections, review checkbox, guide disclosures, footer and back to header. No keyboard trap observed. Disabled export skipped as expected. Visible controls showed3px brown focus outlines.
- Enter activated sample, preflight, review, and Names/Split section controls.
- Space toggled Only issues & notices; table narrowed to report003 and restored.
- ArrowDown/ArrowUp on grouping select changed/restored exact-marker/page modes and invalidated preflight as expected. Enter reran preflight.
- Tab then Shift+Tab returned to Review003.
- Skip link moved sequential navigation past header to workbench inputs. Active element was BODY immediately after activation; next Tab entered the workbench. No separate skip-link failure concluded.
- Rendered leaf-text computed-color scan found zero contrast candidates below4.5:1, calculating against nearest opaque ancestor background. This does not cover image/canvas content, compositing/opacity, all states, focus/non-text contrast, or full WCAG compliance.

## Limits
Not a complete accessibility certification: no screen reader or axe suite, no all-state contrast audit, no every-control activation, no touch/mobile browser/device emulation, no320/375px viewport (native minimum), no zoom/reflow400% test. Upload/import deliberately not activated. No network/no-upload proof or performance claim. Earlier export verification remains separate.

## Artifacts
Committed artifacts: [evidence/keyboard-responsive/](evidence/keyboard-responsive/)
- narrow-landing.jpg (full page)
- narrow-workbench.jpg (full page)
- invisible-focus.jpg (viewport with hidden Import input focused)
- keyboard-trail-landing.json
- keyboard-trail-workbench.json
- contrast-candidates.json (empty list)

## Post-fix live regression, 17:52 UTC
Published asset index-Vpo0mRBu.js directly observed after reload. Publisher identifies version3, Sites commit520d0ee64ce7f344260d365050311076ab47acf5, source09f832439011055305fa1ed668b9dc7b1e7410f8.
- Hidden-focus issue RESOLVED in tested flow: both file inputs report tabIndex=-1; Skip→Tab now directly focuses visible Choose a PDF; next Tab focuses Try sample.
- Keyboard Enter loaded sample and ran preflight; Review003 showed expected source page3.
- Space accepted review checkbox; Enter on export downloaded a real archive despite tightened CSP. Four PDFs independently reopened via pdfinfo, one page each; all hashes match manifest; exact source partition[1,2,3,4].
- Artifacts: fixed-keyboard-focus.jpg, keyboard-csp-export.jpg, keyboard-csp-sample.zip, the ZIP contains the four independently verified PDFs and manifest.
- Recent warning/error log query returned only browser-extension metadata errors, not app/CSP errors. This bounded log query is not a network audit.
