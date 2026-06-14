# Duplicate Content Audit Report

**Date:** 2026-06-14
**Site:** batterycalculators.com
**Pages Audited:** 126 public routes
**Build:** 129 pages, 5.42s build time

---

## Summary

| Category | Status |
|----------|--------|
| **Critical duplicate issues** | 2 (near-duplicate learn pages, near-duplicate FAQ answers on fridge page) |
| **Near-duplicate issues** | 19 exact duplicate FAQ questions, 25+ near-duplicate clusters |
| **Thin content risks** | 0 calculator/learn pages; 5 utility pages (acceptable) |
| **Canonical issues** | Fixed — trailing slash consistency corrected |
| **Schema issues** | None found — all JSON-LD matches visible content |
| **Internal linking gaps** | 5 SEO calculator pages severely isolated |
| **URL duplicates** | None found |

---

## 1. Page Inventory

| Group | Count | Notes |
|-------|-------|-------|
| Home page | 1 | |
| Calculator pages (`/tools/`) | 19 | 18 calculators + index |
| SEO/Landing pages (top-level) | 8 | about, contact, cookies, disclaimer, methodology, privacy, resources, terms |
| Category pages | 7 | bess, engineering, ev, home-backup, marine, rv, solar |
| SEO Calculator Landing Pages | 6 | fridge, cpap, sump-pump, portable-power-station, solar-generator-sizing, home-power-outage |
| Learn articles (`/learn/`) | 82 | 81 articles + index |
| **Total** | **126** | |

All pages have: SEO title, meta description, H1, canonical URL, FAQPage schema (where applicable).

---

## 2. Critical Duplicate Issues

### 2a. Near-Duplicate Learn Pages: "How to Calculate Runtime" (Cluster 2)

**Files:**
- `src/pages/learn/how-to-calculate-battery-runtime.astro`
- `src/pages/learn/how-to-calculate-runtime-of-a-battery.astro`

**Overlap:** ~70% content similarity. Both explain the same 3-step runtime calculation method with nearly identical intros, FAQ themes, and worked examples (only differing in the specific numbers used).

**Status:** `how-to-calculate-battery-runtime` should be differentiated or redirected to `how-to-calculate-runtime-of-a-battery` (which is more detailed with step-by-step cards and common mistakes section).

### 2b. Near-Duplicate FAQ Answers on Fridge Page

**File:** `src/pages/fridge-battery-backup-calculator.astro`

**Near-duplicate answers (copied from home-power-outage):**
1. "What inverter size is needed for a refrigerator?" — **93% identical** to home-power-outage version
2. "How long can a battery run a refrigerator?" — **71% identical** to home-power-outage version
3. "Can a portable power station run a refrigerator?" — **60% similar** to home-power-outage version

**Status:** Must rewrite these 3 FAQ answers with unique, fridge-specific depth.

---

## 3. Near-Duplicate FAQ Questions

### 3a. Exact Duplicate Questions (19 instances across 37+ files)

| # | Question | Pages |
|---|---------|-------|
| 1 | "What is depth of discharge (DoD)?" | learn/battery-depth-of-discharge-chart, learn/how-to-calculate-battery-runtime, tools/solar-battery-sizing |
| 2 | "What is the difference between Ah and Wh?" | tools/energy-conversion, tools/runtime-calculator |
| 3 | "What is the difference between SOC and SoH?" | learn/understanding-state-of-charge, tools/battery-degradation-estimator, tools/soc-estimator |
| 4 | "Does temperature affect charging time?" | learn/how-long-to-charge-a-battery, tools/charging-time-calculator |
| 5 | "How does charger efficiency affect charge time?" | learn/battery-charging-formula, tools/charging-time-calculator |
| 6 | "How long does it take to charge a 100Ah battery?" | learn/how-long-to-charge-a-battery, tools/charging-time-calculator |
| 7 | "Can I charge lithium batteries with a lead-acid charger?" | learn/how-long-to-charge-a-lithium-battery, tools/charging-time-calculator |
| 8 | "Can I charge a battery at a higher C-rate than specified?" | learn/what-is-battery-c-rate, tools/c-rate-calculator |
| 9 | "How many cells do I need for a 48V battery?" | learn/battery-pack-design-basics, tools/battery-pack-calculator |
| 10 | "Do I need a battery monitor for my RV?" | learn/rv-battery-sizing-guide, tools/rv-battery-calculator |
| 11 | "Should I oversize my battery bank?" | learn/how-to-size-solar-battery-bank, tools/battery-sizing-calculator |
| 12 | "What happens if I undersize my battery bank?" | learn/how-many-batteries-for-solar, tools/battery-sizing-calculator |
| 13 | "What inverter efficiency should I assume?" | tools/home-backup-battery, tools/inverter-battery |
| 14 | "How big of a battery do I need for home backup?" | home-backup, learn/home-battery-sizing-guide |
| 15 | "How many batteries do I need for solar?" | learn/how-to-size-solar-battery-bank, solar |
| 16 | "Can I add batteries to my existing solar system?" | home-backup, learn/solar-battery-storage-explained |
| 17 | "How long do solar batteries last?" | learn/best-battery-chemistry-for-solar, learn/solar-battery-storage-explained |
| 18 | "What is a marine hotel load?" | learn/marine-battery-sizing-guide, learn/marine-hotel-load-guide |
| 19 | "What is the difference between series and parallel?" | ev, learn/series-vs-parallel-batteries |

**Recommendation:** Keep on calculator pages (primary tool page wins the canonical question). Rewrite the duplicate on learn pages with a different angle or cross-link to the calculator.

### 3b. Near-Duplicate Questions (80%+ overlap)

25+ clusters identified. Key patterns:
- "How long will a 100Ah battery last?" appears on 5+ pages with slightly different wording
- "How long will a home battery last during a power outage?" on 3 pages
- "Do I need a transfer switch?" on 2 pages
- "Can I run an air conditioner?" on 2 pages (91% overlap)

---

## 4. Doorway Page Audit (5 Supporting Pages)

### fridge-battery-backup-calculator — SOMEWHAT THIN

| Dimension | Status |
|-----------|--------|
| Unique intro | YES |
| Unique whyItMatters | YES |
| Unique worked example | YES |
| Unique expertNotes | YES — duty cycles, compressor surge, LiFePO4 |
| FAQ uniqueness | **PARTIAL** — 3/5 answers near-copied from home-power-outage |
| Formulas | Identical 4-formula set (shared, acceptable) |
| Search intent | Distinct — "fridge battery backup" long-tail |

### cpap-battery-backup-calculator — ADEQUATE

| Dimension | Status |
|-----------|--------|
| Unique intro | YES |
| Unique whyItMatters | YES |
| Unique worked example | YES |
| Unique expertNotes | YES — humidifier power, 12V DC direct, device verification |
| FAQ uniqueness | YES — all 4 questions genuinely CPAP-specific |
| Search intent | Distinct — "CPAP battery backup" medical device |

### sump-pump-battery-backup-calculator — ADEQUATE

| Dimension | Status |
|-----------|--------|
| Unique intro | YES |
| Unique whyItMatters | YES |
| Unique worked example | YES |
| Unique expertNotes | YES — surge analysis, duty cycle, dedicated backup systems |
| FAQ uniqueness | YES — all 4 questions genuinely sump-specific |
| Search intent | Distinct — "sump pump battery backup" flood prevention |

### portable-power-station-runtime-calculator — ADEQUATE

| Dimension | Status |
|-----------|--------|
| Unique intro | YES |
| Unique whyItMatters | YES |
| Unique worked example | YES — multi-load, compares to station Wh rating |
| Unique expertNotes | YES — continuous vs surge, inverter efficiency, temperature |
| FAQ uniqueness | YES — all 4 questions PPS-specific |
| Search intent | Distinct — "portable power station runtime" product evaluation |

### solar-generator-sizing-calculator — ADEQUATE

| Dimension | Status |
|-----------|--------|
| Unique intro | YES |
| Unique whyItMatters | YES |
| Unique worked example | YES — battery + solar + inverter system sizing |
| Unique expertNotes | YES — daily recharge math, overnight sizing, MPPT vs PWM |
| FAQ uniqueness | YES — all 4 questions solar-generator-specific |
| Search intent | Distinct — "solar generator sizing" complete system |

---

## 5. Canonical Issues

### Fixed: Trailing Slash Inconsistency

**Before:** Auto-derived canonicals had trailing slashes (`/learn/battery-degradation-explained/`), while explicit canonicals did not (`/tools/runtime-calculator`).

**After:** `HeadSEO.astro` now strips trailing slashes from all auto-derived canonicals. All 129 pages have consistent, unique, self-referencing canonical URLs.

### Fixed: Error Page Canonicals

Removed hardcoded canonicals from `404.astro` and `500.astro`. These now use auto-derived self-referencing canonicals.

---

## 6. Schema Issues

No issues found. All pages have:
- Correct FAQPage schema matching visible FAQ content
- Correct WebApplication schema with specific calculator names
- Correct BreadcrumbList URLs matching actual routes

---

## 7. Internal Linking Issues

### 5 Severely Isolated Pages (CRITICAL)

All 5 newer SEO calculator pages have **only 1 inbound link** (from `home-power-outage-battery-backup-calculator`):

| Page | Inbound Links | Missing From |
|------|--------------|-------------|
| `/fridge-battery-backup-calculator` | 1 | Home, Tools Index, home-backup category |
| `/cpap-battery-backup-calculator` | 1 | Home, Tools Index, home-backup category |
| `/sump-pump-battery-backup-calculator` | 1 | Home, Tools Index, home-backup category |
| `/portable-power-station-runtime-calculator` | 1 | Home, Tools Index, home-backup category |
| `/solar-generator-sizing-calculator` | 1 | Home, Tools Index, solar category |

**None of these 5 pages link to each other either.**

### Other Isolated Pages

| Page | Inbound Links | Issue |
|------|--------------|-------|
| `bess-roi-calculator` | 2 | Lowest of all calculators |
| `rv-battery-calculator` | 3 | Only linked from home, tools index, home-backup |
| `marine-battery-sizing-calculator` | 3 | Only linked from home, tools index, home-backup |

---

## 8. Near-Duplicate Learn Page Clusters

### Cluster 1: "How long will a XX Ah battery last?" (5 pages)

**Overlap:** ~80-90% in worked examples and formula content. FAQ questions are ~50-60% overlapping.

**Unique value per page:** Each targets a different capacity tier with appropriate application scenarios.

**Recommendation:** Acceptable as templated SEO pages. Remove the "Does voltage matter?" FAQ from 3 pages (keep on 100Ah only). Differentiate the "camping" FAQ between 50Ah and 200Ah.

### Cluster 2: "How to calculate runtime" (3 pages)

**Overlap:** `how-to-calculate-battery-runtime` and `how-to-calculate-runtime-of-a-battery` are ~70% identical.

**Recommendation:** Merge or redirect `how-to-calculate-battery-runtime` → `how-to-calculate-runtime-of-a-battery`. Keep `battery-runtime-formula` as the reference sheet.

### Cluster 3: "How long to charge" (3 pages)

**Overlap:** The 100Ah and lithium pages share the same worked example (100Ah LFP at 0.5C).

**Recommendation:** Differentiate the lithium page's worked example to use a different capacity or NMC chemistry. Remove the duplicate "How long to charge 100Ah" FAQ from the general page.

### Cluster 4: Home backup learn pages (4 pages)

**Overlap:** Runtime + Planning share a near-identical "10kWh battery" FAQ. Sizing + Whole-House share a near-identical "how big" FAQ.

**Recommendation:** Remove the 10kWh FAQ from the planning page (it's a runtime question). Make sizing focus on methodology, whole-house focus on specific cost/sizing.

---

## 9. Thin Content

No calculator or learn pages are thin (all 400+ words). Only 5 utility pages are thin, which is expected:

| Page | Words | Acceptable? |
|------|-------|------------|
| search.astro | 17 | Yes — search UI |
| 500.astro | 32 | Yes — error page |
| 404.astro | 38 | Yes — error page |
| contact.astro | 113 | Yes — contact form |
| privacy.astro | 159 | Yes — legal page |

---

## 10. Recommended Fixes

### Priority 1: Internal Linking (5 pages isolated)

1. Add 5 SEO calculator pages to `tools/index.astro`
2. Add 5 SEO calculator pages to `home-backup.astro` category
3. Add solar-generator-sizing and portable-power-station to `solar.astro` category
4. Cross-link the 5 pages to each other in relatedCalculators

### Priority 2: FAQ Deduplication (fridge page)

5. Rewrite 3 near-duplicate FAQ answers on fridge page with unique depth

### Priority 3: Learn Page Differentiation

6. Remove duplicate "Does voltage matter?" FAQ from 400Ah and 200Ah pages (keep on 100Ah)
7. Differentiate "camping" FAQ between 50Ah and 200Ah pages

---

## 11. Completed Fixes

| Fix | Status |
|-----|--------|
| Canonical trailing slash consistency | DONE — HeadSEO.astro strips trailing slashes |
| Error page canonicals | DONE — removed from 404.astro and 500.astro |
| 5 SEO pages added to tools index | DONE — tools/index.astro updated |
| 5 SEO pages added to home-backup category | DONE — home-backup.astro updated |
| 2 SEO pages added to solar category | DONE — solar.astro updated |
| 5 SEO pages cross-linked to each other | DONE — each page's relatedCalculators updated |
| Fridge page FAQ answers rewritten | DONE — 5 answers rewritten with unique fridge-specific depth |
| "Does voltage matter?" FAQ deduplication | DONE — removed from 50Ah and 400Ah pages (kept on 200Ah) |
| Build verification | DONE — 129 pages built successfully |
