# Production Readiness Checklist

Battery Calculators — Phase 9C Final Checklist

---

## Deployment

- [ ] Domain connected and resolving
- [ ] HTTPS certificate verified (Let's Encrypt or CDN)
- [ ] Analytics environment variables configured (GA4, Clarity)
- [ ] Google Search Console configured and verified
- [ ] Google AdSense application submitted
- [ ] 301 redirects configured (if migrating from staging)

---

## Content — Legal & Trust Pages

- [ ] Privacy Policy page live (`/privacy`)
- [ ] Terms of Service page live (`/terms`)
- [ ] Cookie Policy page live (`/cookies`)
- [ ] Engineering Disclaimer page live (`/disclaimer`)
- [ ] Contact page live (`/contact`)
- [ ] About page live (`/about`)
- [ ] Methodology page live (`/methodology`)

---

## SEO

- [ ] Sitemap generated (`/sitemap-index.xml`)
- [ ] Sitemap submitted to Google Search Console
- [ ] `robots.txt` verified and accessible
- [ ] Canonical URLs verified on all pages
- [ ] Meta descriptions present on all pages
- [ ] OG tags present on all pages
- [ ] FAQ schema present on calculator pages and legal pages

---

## Performance

- [ ] Lighthouse Performance score ≥ 90
- [ ] Lighthouse Accessibility score ≥ 90
- [ ] Lighthouse Best Practices score ≥ 90
- [ ] Lighthouse SEO score ≥ 95
- [ ] Mobile responsiveness verified on common viewports
- [ ] No layout shift (CLS) issues
- [ ] All pages load under 2 seconds on 3G

---

## Functionality

- [ ] All calculator forms produce correct results
- [ ] Search returns relevant results for common queries
- [ ] Theme toggle works (dark ↔ light)
- [ ] Feedback widget stores responses in localStorage
- [ ] 404 page displays correctly
- [ ] 500 page displays correctly
- [ ] Footer links resolve to correct pages
- [ ] Header navigation links resolve correctly
- [ ] Breadcrumbs render on applicable pages

---

## Content Quality

- [ ] No placeholder text remaining on live pages
- [ ] All formulas exposed in calculator pages
- [ ] Worked examples present on calculator pages
- [ ] FAQ sections present on calculator and legal pages
- [ ] Engineering disclaimers present on all calculator pages
- [ ] Related tools section present on all calculator pages

---

## Link Audit

- [ ] No broken internal links (verify with build output)
- [ ] No broken external links (if any exist)
- [ ] All footer links resolve
- [ ] All header navigation links resolve
- [ ] All category page links resolve
- [ ] All learn article links resolve
- [ ] Sitemap links match actual pages

---

## Manual Verification

- [ ] Homepage loads correctly
- [ ] Tools index page lists all calculators
- [ ] Learn index page lists all articles
- [ ] Each category page renders correctly
- [ ] Contact form displays success message
- [ ] Search page returns results for: c rate, runtime, solar, rv, marine, degradation, soc, bess

---

## Remaining Manual Tasks (Post-Development)

1. Purchase domain (if not already done)
2. Create logo and favicon assets
3. Create Google Analytics property
4. Create Google Search Console property
5. Submit AdSense application
6. Set up domain email (contact@batterycalculators.com)
7. Register business entity (if required by jurisdiction)
8. Deploy to production hosting (Netlify, Vercel, Cloudflare Pages, etc.)

---

*Generated: June 9, 2026*
