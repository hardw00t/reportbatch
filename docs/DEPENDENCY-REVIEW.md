# Dependency and license review

Review date: 2026-10-18. Exact installed versions and license identifiers are generated from the committed lockfile and installed package metadata in [DEPENDENCIES.json](DEPENDENCIES.json). Platform-specific optional modules vary by host; the lockfile retains all supported resolutions.

| Component | Role | License / handling |
| --- | --- | --- |
| React / React DOM / scheduler | UI | MIT; full license text shipped in generated notices. |
| PDF.js (`pdfjs-dist`) | Preview and text parsing | Apache-2.0; pinned package, local worker/assets, full license text shipped. CMap/font/codec asset directories retain upstream licenses. |
| pdf-lib / standard-fonts / upng | PDF validation and page copying | MIT; license texts in notices. |
| fflate | Local ZIP creation and reopening | MIT; license text in notices. |
| pako | Transitive PDF compression | MIT AND Zlib; upstream license text retained. |
| tslib | Transitive helpers | 0BSD; notice included. |
| Playwright / TypeScript | Build/test only | Apache-2.0. Not shipped as application runtime. |
| axe-core / @axe-core/playwright | Accessibility test only | MPL-2.0. Unmodified testing dependencies, not bundled into the application. No accessibility conformance claim follows from a passing scan. |
| Vite / associated build tools | Build/dev only | MIT/ISC/BSD/Apache and MPL components identified in the inventory. Not runtime services. |
| @napi-rs/canvas | Optional PDF.js Node support | MIT; used by Node integration tests on this platform. No native module is included in the browser bundle. |
| Noto Sans fixture font | Synthetic Unicode PDF | SIL OFL 1.1; original font, license and hashes retained in [font source notes](../tests/fixtures/fonts/SOURCE.md). |

`scripts/licenses.mjs` fails on an unknown installed license identifier, records metadata, and emits production dependency license/NOTICE texts to `public/THIRD_PARTY_NOTICES.txt`. `scripts/pdf-assets.mjs` copies upstream asset directories with their license files intact. `npm run build` runs both. These notices are included in `dist/`; downstream redistributions must retain them and the original code's MIT license. This is an engineering inventory, not legal advice or a guarantee of complete license analysis for every downstream use.

The explicit full `npm audit` snapshot is [npm-audit.json](evidence/npm-audit.json): zero info/low/moderate/high/critical advisories were reported at the recorded validation date. This is a registry snapshot, not proof of absence of vulnerabilities. Re-audit the exact lockfile before release and review any dependency update.

No runtime CDN, analytics, paid API, account, authentication provider or remote CI service is required. No automated dependency-upgrade service or remote workflow was enabled.
