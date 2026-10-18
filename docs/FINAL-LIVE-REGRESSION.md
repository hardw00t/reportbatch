# Live clipping and cancellation regression

2026-10-18 18:52–18:55 UTC. Dot cloud Chromium, supported browser/native UI only. Public https://reportbatch-private-preview.w00t1337.chatgpt.site/. DOM script verified assets/index-5bThfK0G.js. Publisher associates version4 with source4dcb2b36efbd993edd2a8c4524fc1a88edc37e30, tree ce55a7839c5f2b1cd636682fd72e37c9f55453d3; this browser check independently verifies asset, not source provenance.

## Passed
- Imported synthetic clipped-surname.pdf and clipped-surname-preset.json using supported file chooser. Author region Left5 Top5 Width45 Height20: 'Region clips text; expand it or enter a verified value'; evidence Found: Alex, but output unnamed.pdf Blocked. Review checkbox and export disabled. No falsely accepted Alex.pdf.
- Expanded Width55; keyboard Enter on Run preflight again. Automatic Alex Smith extracted, Alex Smith.pdf Ready. Space review / Enter export produced real ZIP. Manifest author manual:false, source page1. Independently checked SHA256 and reopened exported1page PDF with Poppler.
-500-page loading cancellation: after file chooser, visible Opening local file / Cancel operation. Enter on Cancel returned clean start and status 'Cancelled. No incomplete download was created. You can run preflight again.' Reimport same file + page preset recovered500 outputs.
- Read all10 review-table pages:500 Ready entries. Started export, observed 'Creating and reopening PDFs28 of500', pressed Enter on Cancel operation. UI invalidated outputs to Recheck, disabled review/export, instructed preflight. Keyboard Enter preflight restored results; re-review and export succeeded,4953ms export-to-downloaded-path interval. Actual recovered ZIP independently verified:500 output hashes, all PDFs reopened1page, exact source page order1..500.
- Narrow keyboard table: native Chrome Ctrl+0 then8 Ctrl+plus (400% standard sequence; zoom popup not separately captured this run). Layout viewport innerWidth297, document clientWidth293 and scrollWidth293; table scrollport254 vs content358. Tab from Review001 reached Review002 with visible focus. Right key moved local horizontal scrollLeft from0 to0.5, then native Right held moved to24.75, focus stayed Review002. Thus local horizontal scrolling responds to keyboard while a row button is focused. Restored normal zoom; innerWidth1188.
- Operation/completion messages exposed as role=status in DOM. Clipping error is visible beside Verified Author and in blocked output; only targeted keyboard/error checks, not a screen-reader assessment.

## Evidence
All files beside this report:
- clipping-blocked.jpg, clipping-recovered.jpg, clipping-fixed.zip, clipping-extracted/, clipping-fixed-verified/
-500-cancelled.jpg,500-export-cancelled.jpg,500-recovered.jpg,500-recovery-review.txt,500-recovery.zip,500-recovery-verified/
- narrow-table-keyboard.jpg, narrow-table-scrolled.jpg
- final-archive-verification.json

## Limits
No new defect observed in these targeted checks. Cancellation absence of partial download is the app's visible status, not independently audited browser download-history evidence. No runtime network/storage/header audit, browser RSS, DevTools workaround, offline browser run, full WCAG/screen-reader or real mobile/emulation coverage. Prior DevTools organization restriction remains respected. Performance is one low-complexity synthetic workload. These manual checks do not imply an automated browser suite passed or overall production readiness.

Raw archives and screenshots remain in the QA workspace. The committed independent verification inventory records their exact hashes and results.
