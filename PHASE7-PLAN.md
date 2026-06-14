# Phase 7: Global Battery Calculator Platform

## Transformation Overview

**Current State:** Engineering-focused site serving battery engineers, marine designers, BESS professionals (11 calculators, 5 learn articles, ~22 pages)

**Target State:** Global battery calculator platform serving homeowners, solar users, RV/van life, marine, DIY builders, EV enthusiasts, engineers, and commercial users (30+ calculators, 20+ learn articles, ~60+ pages)

---

## 1. Proposed Site Map

```
/                                          (Homepage - redesigned)
/tools                                     (All calculators index)
/tools/[calculator-slug]                   (Individual calculator pages)

/learn                                     (Learning center hub)
/learn/[article-slug]                      (Individual articles)

/solar                                     (Solar category landing)
/rv                                        (RV & Van Life category landing)
/marine                                    (Marine category landing)
/ev                                        (EV category landing)
/home-backup                               (Home backup category landing)
/engineering                               (Engineering tools category landing)
/bess                                      (BESS & commercial category landing)

/about                                     (About page)
/contact                                   (Contact page)
/privacy                                   (Privacy policy)
/disclaimer                                (Engineering disclaimer)
```

### Calculator URL Structure

```
/tools/runtime-calculator                  (existing)
/tools/charging-time-calculator            (existing)
/tools/energy-conversion-calculator        (existing)
/tools/c-rate-calculator                   (existing)
/tools/voltage-drop-calculator             (existing)
/tools/dc-cable-loss-calculator            (existing)
/tools/battery-sizing-calculator           (existing)
/tools/parallel-string-calculator          (existing)
/tools/soc-estimator                       (existing)
/tools/battery-degradation-estimator       (existing)
/tools/bess-roi-calculator                 (existing)

/tools/solar-battery-sizing-calculator     (NEW)
/tools/off-grid-battery-calculator         (NEW)
/tools/home-backup-calculator              (NEW)
/tools/rv-battery-calculator               (NEW)
/tools/camper-battery-runtime-calculator   (NEW)
/tools/inverter-battery-calculator         (NEW)
/tools/marine-battery-sizing-calculator    (NEW)
/tools/yacht-battery-runtime-calculator    (NEW)
/tools/hotel-load-calculator               (NEW)
/tools/battery-pack-calculator             (NEW)
/tools/battery-voltage-calculator          (NEW)
/tools/cell-configuration-calculator       (NEW)
/tools/peak-shaving-calculator             (NEW)
/tools/demand-charge-calculator            (NEW)
/tools/battery-comparison-tool             (NEW)
```

---

## 2. Homepage Redesign Plan

### Hero Section

```
H1: "Battery Calculators for Solar, Home Backup, RV, Marine, EV, and Energy Storage Systems"

Subheading: "Free engineering-grade battery calculators and sizing tools used by homeowners, installers, DIY builders, and battery professionals."

CTA: "Browse All Calculators" | "Explore Learning Center"
```

### Category Cards Section (7 cards)

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

  <!-- Card 1: Solar & Home Energy -->
  <a href="/solar" class="category-card">
    <SolarIcon />
    <h3>Solar & Home Energy</h3>
    <p>Solar battery sizing, off-grid planning, home backup</p>
    <span>3 Calculators →</span>
  </a>

  <!-- Card 2: RV & Camper -->
  <a href="/rv" class="category-card">
    <RVIcon />
    <h3>RV & Camper</h3>
    <p>Camper battery sizing, runtime planning, inverter tools</p>
    <span>3 Calculators →</span>
  </a>

  <!-- Card 3: Marine -->
  <a href="/marine" class="category-card">
    <MarineIcon />
    <h3>Marine</h3>
    <p>Yacht battery systems, hotel load estimation</p>
    <span>3 Calculators →</span>
  </a>

  <!-- Card 4: EV & Battery Packs -->
  <a href="/ev" class="category-card">
    <EVIcon />
    <h3>EV & Battery Packs</h3>
    <p>Pack configuration, voltage calculations, cell layout</p>
    <span>4 Calculators →</span>
  </a>

  <!-- Card 5: Battery Basics -->
  <a href="/tools" class="category-card">
    <BasicsIcon />
    <h3>Battery Basics</h3>
    <p>Runtime, charging time, energy conversion</p>
    <span>4 Calculators →</span>
  </a>

  <!-- Card 6: Engineering Tools -->
  <a href="/engineering" class="category-card">
    <EngineeringIcon />
    <h3>Engineering Tools</h3>
    <p>C-rate, SOC, SOH, voltage drop, cable loss</p>
    <span>6 Calculators →</span>
  </a>

  <!-- Card 7: BESS & Commercial -->
  <a href="/bess" class="category-card">
    <BESSIcon />
    <h3>BESS & Commercial</h3>
    <p>ROI analysis, peak shaving, demand charge savings</p>
    <span>3 Calculators →</span>
  </a>

</div>
```

### Featured Calculators Section (6 cards)

Top calculators by estimated traffic:

1. **Solar Battery Sizing Calculator** - Highest volume solar keyword
2. **Home Backup Battery Calculator** - Power outage planning
3. **RV Battery Calculator** - RV/van life community
4. **Battery Runtime Calculator** - Universal use case
5. **Battery Pack Calculator** - DIY/EV builders
6. **BESS ROI Calculator** - Commercial decision makers

### Learning Center Section

```html
<section>
  <h2>Learn About Batteries</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- 3 featured articles with thumbnails -->
    <!-- Link to /learn for full catalog -->
  </div>
</section>
```

### Trust Section

```html
<section class="trust-section">
  <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
    <div>
      <h4>Transparent Formulas</h4>
      <p>Every calculation shows the engineering math behind it</p>
    </div>
    <div>
      <h4>No Signup Required</h4>
      <p>Use any calculator instantly, no account needed</p>
    </div>
    <div>
      <h4>Instant Calculations</h4>
      <p>Results appear in real-time as you type</p>
    </div>
    <div>
      <h4>Engineering References</h4>
      <p>Formulas based on standard electrical engineering principles</p>
    </div>
  </div>
</section>
```

---

## 3. New Calculator Roadmap (Ranked by Traffic Potential)

### Tier 1: High Traffic (500-5,000+ monthly searches)

| Priority | Calculator | Target Audience | Search Volume Est. | Complexity |
|----------|-----------|----------------|-------------------|------------|
| 1 | Solar Battery Sizing Calculator | Solar installers, homeowners | 2,400/mo | Medium |
| 2 | Home Backup Battery Calculator | Homeowners | 1,800/mo | Medium |
| 3 | RV Battery Calculator | RV/van life | 1,200/mo | Low |
| 4 | Battery Runtime Calculator (refactor) | Universal | 800/mo | Already exists |
| 5 | Off-Grid Battery Calculator | Off-grid living | 720/mo | Medium |

### Tier 2: Medium Traffic (200-500 monthly searches)

| Priority | Calculator | Target Audience | Search Volume Est. | Complexity |
|----------|-----------|----------------|-------------------|------------|
| 6 | Battery Pack Calculator | DIY builders, EV | 480/mo | Medium |
| 7 | Inverter Battery Calculator | RV, off-grid | 390/mo | Low |
| 8 | Marine Battery Sizing Calculator | Boaters | 320/mo | Medium |
| 9 | Battery Voltage Calculator | DIY, EV | 260/mo | Low |
| 10 | Camper Battery Runtime Calculator | Van life | 210/mo | Low |

### Tier 3: Niche Traffic (50-200 monthly searches)

| Priority | Calculator | Target Audience | Search Volume Est. | Complexity |
|----------|-----------|----------------|-------------------|------------|
| 11 | Peak Shaving Calculator | Commercial | 170/mo | Medium |
| 12 | Hotel Load Calculator | Marine | 140/mo | Low |
| 13 | Demand Charge Calculator | Commercial | 110/mo | Medium |
| 14 | Cell Configuration Calculator | DIY, EV | 90/mo | Medium |
| 15 | Yacht Battery Runtime Calculator | Marine | 70/mo | Low |

### Implementation Phases

**Phase 7A (Week 1-2):** Tier 1 calculators (5 new)
**Phase 7B (Week 3-4):** Tier 2 calculators (5 new)
**Phase 7C (Week 5-6):** Tier 3 calculators (5 new)
**Phase 7D (Week 7-8):** Category landing pages + learn articles

---

## 4. Internal Linking Strategy

### Hub-and-Spoke Model

```
Homepage (/)
├── /solar (Solar category hub)
│   ├── /tools/solar-battery-sizing-calculator (spoke)
│   ├── /tools/off-grid-battery-calculator (spoke)
│   ├── /tools/home-backup-calculator (spoke)
│   └── /learn/solar-batteries (learn spoke)
│
├── /rv (RV category hub)
│   ├── /tools/rv-battery-calculator (spoke)
│   ├── /tools/camper-battery-runtime-calculator (spoke)
│   ├── /tools/inverter-battery-calculator (spoke)
│   └── /learn/rv-batteries (learn spoke)
│
├── /marine (Marine category hub)
│   ├── /tools/marine-battery-sizing-calculator (spoke)
│   ├── /tools/yacht-battery-runtime-calculator (spoke)
│   ├── /tools/hotel-load-calculator (spoke)
│   └── /learn/marine-batteries (learn spoke)
│
├── /ev (EV category hub)
│   ├── /tools/battery-pack-calculator (spoke)
│   ├── /tools/battery-voltage-calculator (spoke)
│   ├── /tools/cell-configuration-calculator (spoke)
│   └── /learn/ev-batteries (learn spoke)
│
├── /tools (All tools index)
│   ├── All 30+ calculator pages (spokes)
│   └── /learn (learning center)
│
├── /engineering (Engineering tools hub)
│   ├── /tools/c-rate-calculator (spoke)
│   ├── /tools/soc-estimator (spoke)
│   ├── /tools/voltage-drop-calculator (spoke)
│   └── /learn/engineering (learn spoke)
│
└── /bess (BESS category hub)
    ├── /tools/bess-roi-calculator (spoke)
    ├── /tools/peak-shaving-calculator (spoke)
    ├── /tools/demand-charge-calculator (spoke)
    └── /learn/bess (learn spoke)
```

### Cross-Linking Rules

1. **Every calculator page** links to:
   - Parent category hub
   - 2-3 related calculators
   - 1-2 related learn articles

2. **Every learn article** links to:
   - 1-2 related calculators
   - Parent category hub
   - 1-2 related learn articles

3. **Every category hub** links to:
   - All calculators in that category
   - Related learn articles
   - Parent homepage

4. **Homepage** links to:
   - All 7 category hubs
   - 6 featured calculators
   - 3 featured learn articles

### Breadcrumb Structure

```
Home > Solar & Home Energy > Solar Battery Sizing Calculator
Home > RV & Camper > RV Battery Calculator
Home > Engineering Tools > C-Rate Calculator
```

---

## 5. SEO Expansion Strategy (US-Focused Traffic)

### Target Keywords by Category

#### Solar & Home Energy
| Keyword | Search Volume | Difficulty | Page |
|---------|--------------|------------|------|
| solar battery sizing calculator | 2,400/mo | Medium | /tools/solar-battery-sizing-calculator |
| home battery backup calculator | 1,800/mo | Medium | /tools/home-backup-calculator |
| off-grid battery calculator | 720/mo | Low | /tools/off-grid-battery-calculator |
| how to size a solar battery | 590/mo | Low | /learn/solar-battery-sizing |
| best battery for solar backup | 480/mo | High | /learn/solar-batteries |

#### RV & Van Life
| Keyword | Search Volume | Difficulty | Page |
|---------|--------------|------------|------|
| RV battery calculator | 1,200/mo | Low | /tools/rv-battery-calculator |
| camper battery runtime | 390/mo | Low | /tools/camper-battery-runtime-calculator |
| how long will my RV battery last | 320/mo | Low | /learn/rv-batteries |
| inverter battery sizing | 260/mo | Low | /tools/inverter-battery-calculator |
| van life battery setup | 210/mo | Medium | /learn/rv-batteries |

#### Marine
| Keyword | Search Volume | Difficulty | Page |
|---------|--------------|------------|------|
| marine battery sizing | 320/mo | Low | /tools/marine-battery-sizing-calculator |
| yacht battery runtime | 140/mo | Low | /tools/yacht-battery-runtime-calculator |
| boat battery calculator | 110/mo | Low | /tools/marine-battery-sizing-calculator |
| hotel load calculator marine | 70/mo | Low | /tools/hotel-load-calculator |

#### EV & Battery Packs
| Keyword | Search Volume | Difficulty | Page |
|---------|--------------|------------|------|
| battery pack calculator | 480/mo | Medium | /tools/battery-pack-calculator |
| battery voltage calculator | 260/mo | Low | /tools/battery-voltage-calculator |
| series parallel battery calculator | 210/mo | Low | /tools/parallel-string-calculator |
| EV battery pack design | 170/mo | Medium | /learn/ev-batteries |

#### Engineering & BESS
| Keyword | Search Volume | Difficulty | Page |
|---------|--------------|------------|------|
| BESS ROI calculator | 170/mo | Low | /tools/bess-roi-calculator |
| battery c-rate calculator | 140/mo | Low | /tools/c-rate-calculator |
| battery degradation calculator | 110/mo | Low | /tools/battery-degradation-estimator |
| peak shaving calculator | 90/mo | Low | /tools/peak-shaving-calculator |

### On-Page SEO Template

Each calculator page must include:

```html
<title>[Calculator Name] - Free Online Calculator | Battery Calculators</title>
<meta name="description" content="Free [calculator name] for [audience]. [Key benefit]. Instant results with transparent formulas.">
<link rel="canonical" href="https://batterycalculators.com/tools/[slug]">

<!-- Open Graph -->
<meta property="og:title" content="[Calculator Name] | Battery Calculators">
<meta property="og:description" content="Free [calculator name] for [audience].">
<meta property="og:type" content="website">

<!-- Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "[Calculator Name]",
  "applicationCategory": "EngineeringApplication",
  "offers": { "@type": "Offer", "price": "0" }
}
</script>
```

### Content Strategy for Learn Articles

**Phase 7D Learn Articles (20 new articles):**

```
/learn/solar-batteries
  - How to Size a Solar Battery Bank
  - Solar Battery Backup vs Grid-Tied
  - Best Battery Chemistry for Solar Storage

/learn/home-backup
  - Home Battery Backup Planning Guide
  - How Long Will a Battery Backup Last
  - Tesla Powerwall vs DIY Battery Backup

/learn/rv-batteries
  - RV Battery Setup Guide for Beginners
  - How to Calculate RV Battery Runtime
  - Lithium vs Lead-Acid for RV Campers

/learn/marine-batteries
  - Marine Battery Sizing Guide
  - Yacht Electrical System Design
  - Hotel Load Estimation for Boats

/learn/ev-batteries
  - EV Battery Pack Design Basics
  - Series vs Parallel Battery Configuration
  - Understanding Battery Voltage Systems

/learn/bess
  - BESS ROI Analysis Guide
  - Peak Shaving with Battery Storage
  - Commercial Battery Storage Economics

/learn/battery-basics
  - Understanding Battery C-Rate
  - What is State of Charge (SOC)
  - Battery Degradation Explained
  - How to Calculate Battery Runtime
```

### Technical SEO Requirements

1. **Page Speed:** All pages must score 90+ on Lighthouse
2. **Mobile-First:** Responsive design for all breakpoints
3. **Core Web Vitals:** LCP < 2.5s, FID < 100ms, CLS < 0.1
4. **Internal Links:** Minimum 3 internal links per page
5. **Schema Markup:** WebApplication + FAQPage on all calculators
6. **Canonical URLs:** Self-referencing canonicals on all pages
7. **Sitemap:** Auto-generated sitemap-index.xml
8. **Robots.txt:** Allow all crawlers, disallow /api/

### Link Building Strategy

1. **Calculator Embeds:** Allow other sites to embed calculators (with attribution)
2. **Guest Posts:** Write for solar/RV/marine blogs with calculator links
3. **Forum Participation:** Answer questions on Reddit, forums with calculator links
4. **YouTube Tutorials:** Create video tutorials for each calculator category
5. **Product Reviews:** Review battery products with calculator references

---

## 6. Implementation Checklist

### Phase 7A: Foundation (Week 1-2)
- [ ] Redesign homepage with new hero, category cards, featured calculators
- [ ] Create category landing pages (7 pages)
- [ ] Build solar battery sizing calculator
- [ ] Build home backup battery calculator
- [ ] Build RV battery calculator
- [ ] Build off-grid battery calculator
- [ ] Update navigation for new categories

### Phase 7B: Expansion (Week 3-4)
- [ ] Build camper battery runtime calculator
- [ ] Build inverter battery calculator
- [ ] Build marine battery sizing calculator
- [ ] Build battery pack calculator
- [ ] Build battery voltage calculator
- [ ] Add cross-links to all existing calculators

### Phase 7C: Niche (Week 5-6)
- [ ] Build yacht battery runtime calculator
- [ ] Build hotel load calculator
- [ ] Build peak shaving calculator
- [ ] Build demand charge calculator
- [ ] Build cell configuration calculator
- [ ] Update all learn articles with new internal links

### Phase 7D: Content (Week 7-8)
- [ ] Write 20 new learn articles
- [ ] Create category-specific learn hubs
- [ ] Update homepage learn section
- [ ] Add breadcrumb navigation to all pages
- [ ] Submit updated sitemap to Google Search Console

### Phase 7E: Optimization (Week 9-10)
- [ ] A/B test homepage hero copy
- [ ] Monitor Search Console for keyword opportunities
- [ ] Optimize underperforming pages
- [ ] Add calculator embed feature
- [ ] Create YouTube tutorial content

---

## 7. Success Metrics

### Traffic Goals (6 months post-launch)
- Monthly organic traffic: 10,000 → 50,000 sessions
- Indexed pages: 22 → 60+
- Backlinks: 50 → 200+
- Domain Authority: 15 → 30

### Engagement Goals
- Average time on page: 2:00 → 3:30 minutes
- Calculator usage rate: 40% → 60%
- Learn article completion: 30% → 50%
- Return visitor rate: 20% → 35%

### Revenue Goals (if applicable)
- Ad revenue: $0 → $500/mo
- Affiliate conversions: 0 → 50/mo
- Lead generation: 0 → 100/mo

---

## 8. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Thin content | Each calculator has 500+ word description, formula explanation, worked example |
| Keyword cannibalization | Unique target keyword per calculator, clear page hierarchy |
| Technical debt | Reuse existing CalculatorLayout, InputField, ResultBox components |
| Mobile experience | Mobile-first design, test on all breakpoints |
| Page speed | Static generation, optimized assets, lazy loading |

---

## 9. Technology Requirements

### Existing Stack (No Changes)
- Astro 6.4.4 (static site generation)
- Tailwind CSS v4.2.0
- TypeScript
- CalculatorLayout, InputField, ResultBox, FormulaBox, FAQSection, RelatedTools components

### New Components Needed
- CategoryCard.astro (for homepage category grid)
- CategoryLanding.astro (for /solar, /rv, etc. pages)
- Breadcrumb.astro (for navigation hierarchy)
- CalculatorEmbed.astro (for embedding calculators on other sites)

### New Utility Functions
- All new calculator formulas in calculators.ts
- SEO metadata helpers
- Category/taxonomy management

---

*Phase 7 Plan Created: June 9, 2026*
*Target Completion: August 18, 2026 (10 weeks)*
