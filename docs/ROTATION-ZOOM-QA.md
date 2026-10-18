# Rotated export and browser zoom follow-up
2026-10-18 18:47–18:49UTC; same public preview/index-Vpo0mRBu.js, dot cloud Chrome. No DevTools or policy bypass.

## Rotated/cropped: PASS with appropriate region
Visible source showed90°rotated headers on right side. Set each required field's region to Left68%,Top0%,Width30%,Height50% using numeric UI controls. Correct extraction returned2026-10-12/Alex Morgan/Site visit without manual value overrides. Default unrotated header region was the cause of prior blocked preflight; no rotation bug established.
Downloaded rotated.zip. PDF reopened, one page; SHA256 matches manifest. Rotation90°, MediaBox[0,0,612,792], CropBox[30,30,582,762] preserved. Independently rendered source and exported PDF with Poppler cropbox at1000px; same image dimensions and zero pixel difference. Output also visually inspected.

## Unicode visual check
Rendered earlier unicode.zip output and visually inspected accented Latin/Greek author and Résumé type. Archive name/hash/reopen checks were already passed in import-boundary-report.md.

## Zoom
Native browser shortcuts, with visible Chrome zoom popup confirming200% and400%. Accidentally stepped to500%, then immediately corrected to400%;500% was not claimed as pass. Restored100% after checks.
-200%: DOM586pxwide×380pxtall; document scrollWidth586px. Visible rules/buttons reflowed to a single column; no global horizontal overflow observed.
-400%: DOM293pxwide; document scrollWidth293px. Focused Verified Author field fully inside viewport,217.25pxwide with visible focus outline. Tab from Verified Date reached Author correctly.
-Table retains local horizontal scrolling at400%: container261px, table scroll358px, overflow-x:auto. Its status/filename columns require scrolling; document itself does not horizontally overflow. This is limited reflow assessment, not full WCAG/keyboard-scroll certification.

## Artifacts
docs/evidence/import-boundaries/:
rotated.zip, rotated-extracted/, rotated-source.png, rotated-output.png, rotated-adjusted-export.jpg, unicode-render.png, zoom200.jpg, zoom400.jpg.
Privacy runtime capture remains blocked by organization DevTools policy; browser RSS and full accessibility audit remain unverified.
