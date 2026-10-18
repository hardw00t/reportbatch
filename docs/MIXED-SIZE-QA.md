# Mixed-size PDF export fidelity

PASS, 2026-10-18 18:57–18:59 UTC. Dot cloud Chromium using supported file chooser and visible UI. Live public preview DOM verified assets/index-5bThfK0G.js.

Imported tests/fixtures/mixed-sizes.pdf. Default header regions (Left4%,Top4%,Width92%,Height36%) extracted all fields automatically. No region changes or manual corrections. Four reports cover pages1–4 exactly. Report003's literal date12/10/2026 correctly received a filename sanitation notice; reviewed the notice and exported12_10_2026_Zoë Martin_Survey.pdf.

Actual downloaded mixed-sizes.zip contains four named one-page PDFs and manifest. Independently reopened every PDF with pypdf, checked exact source page assignment, all SHA256 values, and all field manual flags false. Source/output MediaBox and CropBox match exactly: pages1/3=[0,0,612,792]; pages2/4=[0,0,595,842]. All rotations0.

Independently rendered each source page and corresponding output using Poppler pdftoppm, cropbox, scale-to1000 PNG. All four source/output pairs have identical dimensions and are pixel-identical by PIL ImageChops. Visually inspected each output PNG: readable headers/content/footer; no new clipping or missing content. Poppler printed Fontconfig unwritable-cache warnings but exited0 and produced all eight renders successfully; comparison and visual inspection completed.

Evidence beside this report: mixed-sizes.zip, mixed-sizes-export.jpg, mixed-sizes-verification.json, mixed-sizes-verified/ containing all four outputs plus source-1..4.png and output-1..4.png. This closes the requested mixed-size export fidelity gate for this synthetic fixture. No unrelated tests, DevTools, security bypass, or overall production-readiness inference.
