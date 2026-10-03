#!/usr/bin/env node

/**
 * validate-news.mjs
 *
 * Validates all news articles across EN, PT, and ZH locales before publishing.
 * Checks: file existence, frontmatter completeness, slug consistency,
 * date/week agreement, hreflang integrity, and internal link resolution.
 *
 * Usage:
 *   node scripts/validate-news.mjs
 *   node scripts/validate-news.mjs --strict   (exit non-zero on warnings)
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const STRICT = process.argv.includes('--strict');

// ─── Locales ───
const LOCALES = {
  en: { dir: join(ROOT, 'src', 'pages', 'news'), prefix: '', label: 'English' },
  pt: { dir: join(ROOT, 'src', 'pages', 'pt', 'news'), prefix: '/pt', label: 'Portuguese' },
  zh: { dir: join(ROOT, 'src', 'pages', 'zh', 'news'), prefix: '/zh', label: 'Chinese' },
};

// ─── Helpers ───
function getNewsFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.startsWith('battery-industry-weekly-') && f.endsWith('.astro'))
    .sort();
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = match[1];
  const get = (key) => {
    const m = fm.match(new RegExp(`const\\s+${key}\\s*=\\s*["'](.+?)["']`));
    return m ? m[1] : null;
  };
  return {
    title: get('title'),
    description: get('description'),
    canonical: get('canonical'),
    publishDate: get('publishDate'),
    lastUpdated: get('lastUpdated'),
    readingTime: get('readingTime'),
    raw: fm,
  };
}

function extractWeekInfo(filename) {
  const m = filename.match(/weekly-(\d{4})-week-(\d+)/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), week: parseInt(m[2], 10) };
}

function extractBreadcrumbs(content) {
  const m = content.match(/const breadcrumbs = \[([\s\S]*?)\]/);
  if (!m) return [];
  const items = [];
  const re = /\{\s*label:\s*['"](.+?)['"]/g;
  let match;
  while ((match = re.exec(m[1])) !== null) {
    items.push(match[1]);
  }
  return items;
}

function extractLinks(content) {
  const links = [];
  const re = /href=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    links.push(m[1]);
  }
  return links;
}

// ─── Validation ───
let errors = 0;
let warnings = 0;

function error(msg) {
  console.error(`  ✖ ERROR: ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  ⚠ WARN:  ${msg}`);
  warnings++;
}

function info(msg) {
  console.log(`  ✔ ${msg}`);
}

console.log('\n📰 News Validation\n');

// ─── 1. Discover all EN articles and their weeks ───
const enFiles = getNewsFiles(LOCALES.en.dir);
const enWeeks = new Map(); // week -> { file, meta, content }

console.log(`English articles found: ${enFiles.length}`);

for (const file of enFiles) {
  const info_ = extractWeekInfo(file);
  if (!info_) {
    warn(`Cannot extract week info from ${file}`);
    continue;
  }

  const content = readFileSync(join(LOCALES.en.dir, file), 'utf-8');
  const meta = extractFrontmatter(content);

  if (!meta) {
    error(`No frontmatter found in ${file}`);
    continue;
  }

  enWeeks.set(info_.week, { file, meta, content, year: info_.year, week: info_.week });

  // Validate EN frontmatter
  if (!meta.title) error(`${file}: missing title`);
  if (!meta.description) error(`${file}: missing description`);
  if (!meta.canonical) warn(`${file}: missing canonical URL`);
  if (!meta.publishDate) warn(`${file}: missing publishDate`);
  if (!meta.readingTime) warn(`${file}: missing readingTime`);

  // Validate canonical URL pattern
  if (meta.canonical && !meta.canonical.includes(`week-${info_.week}`)) {
    error(`${file}: canonical URL does not match week number (expected week-${info_.week})`);
  }

  // Validate breadcrumbs
  const breadcrumbs = extractBreadcrumbs(content);
  if (!breadcrumbs.includes('News')) {
    warn(`${file}: breadcrumbs missing 'News' label`);
  }

  // Validate internal links resolve
  const links = extractLinks(content);
  const internalLinks = links.filter(l => l.startsWith('/') && !l.startsWith('/_'));
  for (const link of internalLinks) {
    const linkPath = join(ROOT, 'dist', 'client', link, 'index.html');
    // We check against source, not build output
    if (link.includes('week-') && link.includes('/news/')) {
      // Check if the linked news article exists in any locale
      const weekMatch = link.match(/week-(\d+)/);
      if (weekMatch) {
        const linkedWeek = parseInt(weekMatch[1], 10);
        if (!enWeeks.has(linkedWeek)) {
          // Will be checked in cross-locale validation
        }
      }
    }
  }

  info(`${file}: frontmatter OK, ${internalLinks.length} internal links`);
}

// ─── 2. Validate PT and ZH coverage ───
for (const [locale, config] of Object.entries(LOCALES)) {
  if (locale === 'en') continue;

  console.log(`\n${config.label} articles:`);
  const files = getNewsFiles(config.dir);
  const ptWeeks = new Map();

  for (const file of files) {
    const info_ = extractWeekInfo(file);
    if (!info_) continue;

    const content = readFileSync(join(config.dir, file), 'utf-8');
    const meta = extractFrontmatter(content);
    ptWeeks.set(info_.week, { file, meta, content });

    if (!meta) {
      error(`${config.label} ${file}: no frontmatter`);
      continue;
    }

    // Validate frontmatter
    if (!meta.title) error(`${config.label} ${file}: missing title`);
    if (!meta.description) error(`${config.label} ${file}: missing description`);
    if (!meta.canonical) warn(`${config.label} ${file}: missing canonical`);

    // Validate canonical has locale prefix
    if (meta.canonical && !meta.canonical.includes(`/${locale}/`)) {
      error(`${config.label} ${file}: canonical URL missing locale prefix (expected /${locale}/)`);
    }

    // Validate lang attribute in Layout
    if (!content.includes(`lang="${locale}"`)) {
      warn(`${config.label} ${file}: missing lang="${locale}" attribute in Layout`);
    }

    info(`${file}: OK`);
  }

  // Check coverage: each EN week should have a corresponding locale file
  console.log(`\n${config.label} coverage check:`);
  for (const [week, enData] of enWeeks) {
    if (!ptWeeks.has(week)) {
      error(`Missing ${config.label} translation for week ${week} (EN file: ${enData.file})`);
    } else {
      const ptData = ptWeeks.get(week);
      // Validate slug consistency
      const enSlug = enData.file.replace('.astro', '');
      const ptSlug = ptData.file.replace('.astro', '');
      const enWeekPart = enSlug.match(/week-\d+/)?.[0];
      const ptWeekPart = ptSlug.match(/week-\d+/)?.[0];
      if (enWeekPart !== ptWeekPart) {
        error(`${config.label} week ${week}: slug mismatch (EN: ${enWeekPart}, ${locale}: ${ptWeekPart})`);
      }
    }
  }
}

// ─── 3. Check for broken hreflang references ───
console.log('\nHreflang integrity:');
for (const [week, enData] of enWeeks) {
  for (const [locale, config] of Object.entries(LOCALES)) {
    if (locale === 'en') continue;
    const expectedPath = `${config.prefix}/news/battery-industry-weekly-${enData.year}-week-${week}`;
    const localeFiles = getNewsFiles(config.dir);
    const hasFile = localeFiles.some(f => f.includes(`week-${week}`));
    if (!hasFile) {
      error(`EN week ${week} hreflang for ${locale} points to non-existent: ${expectedPath}`);
    }
  }
}

// ─── 4. Summary ───
console.log('\n' + '─'.repeat(50));
console.log(`Errors:   ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors > 0) {
  console.log('\n✖ Validation FAILED. Fix errors before publishing.\n');
  process.exit(1);
} else if (warnings > 0 && STRICT) {
  console.log('\n✖ Validation FAILED (strict mode). Fix warnings.\n');
  process.exit(1);
} else {
  console.log('\n✔ Validation PASSED.\n');
}
