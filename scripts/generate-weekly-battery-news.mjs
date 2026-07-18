#!/usr/bin/env node

/**
 * generate-weekly-battery-news.mjs
 *
 * Generates a weekly battery industry intelligence article as an Astro page.
 * Fetches RSS feeds from trusted sources, deduplicates, categorizes, and
 * produces a draft-quality article page under src/pages/news/.
 *
 * Usage:
 *   node scripts/generate-weekly-battery-news.mjs --year 2026 --week 26
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ─── CLI Argument Parsing ───
function parseArgs() {
  const args = process.argv.slice(2);
  const now = new Date();
  const currentWeek = getISOWeek(now);
  const currentYear = now.getFullYear();

  let year = currentYear;
  let week = currentWeek;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--year' && args[i + 1]) {
      year = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--week' && args[i + 1]) {
      week = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return { year, week };
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getWeekDateRange(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1));
  const weekStart = new Date(startOfWeek1);
  weekStart.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  return { start: weekStart, end: weekEnd };
}

// ─── RSS Feed Fetching ───
async function fetchRSSFeed(feed, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BatteryCalculators-NewsBot/1.0 (https://batterycalculators.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const items = parseRSSItems(text, feed);
    return items;
  } catch (err) {
    console.log(`  ⚠ Could not fetch ${feed.name}: ${err.message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parseRSSItems(xml, feed) {
  const items = [];
  const itemMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const description = extractTag(itemXml, 'description');

    if (title) {
      items.push({
        title: cleanHTML(title).trim(),
        link: link || '',
        pubDate: pubDate || '',
        summary: cleanHTML(description || '').substring(0, 200).trim(),
        source: feed.name,
        category: feed.category,
      });
    }
  }

  return items;
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(regex);
  if (cdataMatch) return cdataMatch[1];

  const simpleRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const simpleMatch = xml.match(simpleRegex);
  if (simpleMatch) return simpleMatch[1];

  const emptyRegex = new RegExp(`<${tag}[^>]*>([^<]*)`, 'i');
  const emptyMatch = xml.match(emptyRegex);
  return emptyMatch ? emptyMatch[1] : '';
}

function cleanHTML(str) {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Deduplication ───
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a, b) {
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function deduplicateStories(stories) {
  const seen = [];
  const unique = [];

  for (const story of stories) {
    const norm = normalizeTitle(story.title);
    let isDuplicate = false;

    for (const s of seen) {
      if (similarity(norm, s) > 0.6) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.push(norm);
      unique.push(story);
    }
  }

  return unique;
}

// ─── Categorization ───
const CATEGORY_KEYWORDS = {
  ev: [
    'electric vehicle', 'ev ', 'evs', 'tesla', 'byd', 'rivian', 'lucid',
    'chargepoint', 'electrify america', 'fast charging', 'dc fast',
    'vehicle-to-grid', 'v2g', 'automotive', 'cathode', 'anode',
    'gigafactory', 'ev battery', 'phev', 'phevs', 'hybrid vehicle',
  ],
  marine: [
    'marine', 'ship', 'vessel', 'ferry', 'boat', 'maritime', 'shipping',
    'naval', 'offshore', 'imo', 'port', 'harbor', 'yacht', 'trolling',
    'electric boat', 'hybrid vessel', 'shore power',
  ],
  bess: [
    'grid-scale', 'grid scale', 'bess', 'energy storage system',
    'utility scale', 'utility-scale', 'mwh', 'gwh', 'grid storage',
    'peak shaving', 'frequency regulation', 'demand response',
    'ancillary services', 'power purchase', 'ppa',
  ],
  residential: [
    'residential', 'home battery', 'home storage', 'powerwall',
    'solar-plus-storage', 'behind the meter', 'btm', 'rooftop',
    'home backup', 'whole home',
  ],
  manufacturing: [
    'manufacturing', 'gigafactory', 'factory', 'production line',
    'cell production', 'cathode production', 'electrode', 'dry electrode',
    'roll-to-roll', 'scaling', 'supply chain', 'raw material',
    'lithium mining', 'cobalt', 'nickel', 'manganese', 'graphite',
  ],
  passport: [
    'battery passport', 'regulation', 'eu battery', 'compliance',
    'due diligence', 'carbon footprint', 'recycled content',
    'digital product passport', 'dpp', 'regulatory', 'legislation',
    'policy', 'standard', 'certification',
  ],
  recycling: [
    'recycling', 'second life', 'second-life', 'reuse', 'end of life',
    'circular economy', 'hydrometallurgical', 'pyrometallurgical',
    'black mass', 'battery recycling',
  ],
  safety: [
    'safety', 'thermal runaway', 'fire', 'incident', 'testing',
    'un safety', 'ul ', 'ul 2580', 'ip67', 'ip68', 'certification',
    'failure', 'hazard', 'recall',
  ],
  research: [
    'solid state', 'solid-state', 'sodium-ion', 'sodium ion',
    'lithium-sulfur', 'lithium sulfur', 'anode-free', 'anode free',
    'lfp', 'lifepo4', 'nmc', 'research', 'study', 'breakthrough',
    'laboratory', 'energy density', 'wh/kg', 'cycle life',
    'chemistry', 'electrolyte', 'separator', 'silicon anode',
  ],
};

function categorizeStory(story) {
  const text = `${story.title} ${story.summary} ${story.source}`.toLowerCase();
  const scores = {};

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[cat] = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) scores[cat]++;
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'research';
}

// ─── Story Selection ───
function selectTopStories(stories, count = 10) {
  const scored = stories.map(story => {
    let score = 0;
    const text = `${story.title} ${story.summary}`.toLowerCase();

    // Boost for multiple keyword hits
    const batteryWords = ['battery', 'batteries', 'kwh', 'mwh', 'gwh', 'cell', 'pack'];
    for (const w of batteryWords) {
      if (text.includes(w)) score += 2;
    }

    // Boost for source diversity
    if (['PV Magazine', 'Energy Storage News', 'DNV', 'IMO'].includes(story.source)) score += 3;

    // Boost for recency (stories with dates)
    if (story.pubDate) score += 1;

    return { ...story, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count);
}

// ─── Weekday Name ───
function getWeekdayName(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Article Generation ───
function generateArticlePage(data) {
  const {
    year, week, dateRange, topStories, categorized, today, todayStr,
  } = data;

  const weekLabel = `Week ${week}`;
  const dateLabel = `${dateRange.start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${dateRange.end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  const shortDateLabel = `${dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const title = `Battery Industry Weekly — ${weekLabel}, ${year}`;
  const metaTitle = `Battery Industry Weekly — ${weekLabel}, ${year} | Battery Calculators`;
  const metaDescription = `This week in batteries: ${topStories.slice(0, 3).map(s => escapeJSX(s.title).toLowerCase()).join(', ')}.`;
  const canonical = `https://batterycalculators.com/news/battery-industry-weekly-${year}-week-${week}`;

  const readingTime = Math.max(10, Math.round(topStories.length * 2 + 4));

  const faqItems = [
    {
      question: 'What is the Battery Industry Weekly?',
      answer: 'A short editorial digest covering the most important battery industry news each week — EV batteries, grid-scale storage, regulation, manufacturing, and research.',
    },
    {
      question: 'How are stories selected?',
      answer: 'The generator fetches RSS feeds from trusted sources, deduplicates similar stories, scores them by relevance, and selects the top stories for the week.',
    },
    {
      question: 'When is the digest published?',
      answer: 'A new edition is generated every Friday covering the current week.',
    },
  ];

  const storySections = topStories.map((s, i) => {
    const cat = categorized[s.title] || s.category;
    const catLabel = cat.toUpperCase().replace('BEV', 'EV BATTERIES').replace('PASSPORT', 'REGULATION');
    const borderClass = i > 0 ? ' border-t border-hairline pt-12' : '';
    const summary = escapeJSX(s.summary || 'Details limited from source; verify before publishing.');
    const paragraphs = summary.split(/(?<=[.!?])\s+/).filter(Boolean);
    const p1 = paragraphs[0] || summary;
    const p2 = paragraphs.slice(1, 3).join(' ');
    const p3 = paragraphs.slice(3).join(' ');

    return `    <!-- Story ${i + 1} -->
    <section class="mb-12${borderClass}">
      <span class="text-label-uppercase text-m-blue-light text-[10px] block mb-2">${catLabel}</span>
      <h2 class="text-title-xl text-primary mb-4">${escapeJSX(s.title)}</h2>
      <p class="text-body-md text-body font-light mb-4">${p1}</p>${p2 ? `\n      <p class="text-body-md text-body font-light">${p2}</p>` : ''}
    </section>`;
  }).join('\n\n');

  const sourcesList = topStories.filter(s => s.link).map(s =>
    `        <li><a href="${escapeJSX(s.link)}" class="text-m-blue-light hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">${escapeJSX(s.title)} — ${escapeJSX(s.source)}</a></li>`
  ).join('\n');

  const page = `---
import Layout from '../../layouts/Layout.astro';
import Breadcrumb from '../../components/Breadcrumb.astro';
import FAQSection from '../../components/FAQSection.astro';

const title = "${escapeJSX(metaTitle)}";
const description = "${escapeJSX(metaDescription)}";
const canonical = "${canonical}";
const publishDate = "${todayStr}";
const lastUpdated = "${todayStr}";
const readingTime = ${readingTime};

const faqItems = ${JSON.stringify(faqItems, null, 2)};

const breadcrumbs = [
  { label: 'News', href: '/news' },
  { label: '${weekLabel}, ${year}' },
];
---

<Layout
  title={title}
  description={description}
  canonical={canonical}
  ogType="article"
  schema="webApplication"
  schemaName="${escapeJSX(title)}"
  schemaDescription={description}
  faqItems={faqItems}
  breadcrumbs={breadcrumbs}
>
  <article class="max-w-3xl mx-auto">

    <!-- Header -->
    <div class="mb-12 border-b border-hairline pb-8">
      <a href="/news" class="text-label-uppercase text-xs text-muted hover:text-primary transition-colors mb-4 inline-block">&larr; Back to News</a>
      <Breadcrumb items={breadcrumbs} />
      <span class="text-label-uppercase text-m-blue-light text-xs block mb-4">WEEKLY EDITION</span>
      <h1 class="text-display-md text-primary mb-4">Battery Industry Weekly — ${weekLabel}</h1>
      <div class="flex flex-wrap items-center gap-4 text-caption text-muted mb-6">
        <span>${shortDateLabel}</span>
        <span>{readingTime} min read</span>
      </div>
      <p class="text-body-md text-body font-light">
        ${escapeJSX(metaDescription)}
      </p>
    </div>

${storySections}

    <!-- Analysis -->
    <section class="mb-12 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-6">The Week in Context</h2>
      <div class="bg-surface-card border border-hairline p-6">
        <p class="text-body-md text-body font-light mb-4">
          Three themes worth tracking from this week's news:
        </p>
        <ul class="flex flex-col gap-4 text-body-sm text-muted">
          <li>
            <strong class="text-primary">Scale is the new normal.</strong> Battery deployment continues to grow across every segment — EVs, grid storage, and marine — making batteries a core infrastructure technology rather than a niche market.
          </li>
          <li>
            <strong class="text-primary">Chemistry diversity is accelerating.</strong> LFP, solid-state, sodium-ion, and silicon-anode chemistries are all progressing simultaneously, each targeting different cost and performance tradeoffs.
          </li>
          <li>
            <strong class="text-primary">Regulation is reshaping supply chains.</strong> EU battery passport requirements and domestic manufacturing incentives are forcing companies to rethink sourcing, documentation, and compliance timelines.
          </li>
        </ul>
      </div>
    </section>

    <!-- What to Watch -->
    <section class="mb-12 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-6">What to Watch Next Week</h2>
      <div class="bg-surface-card border border-hairline p-6">
        <ul class="flex flex-col gap-3 text-body-sm text-muted list-disc pl-5">
          <li>Continued updates on solid-state battery commercialization timelines</li>
          <li>EU Battery Regulation implementation guidance from the European Commission</li>
          <li>New grid-scale BESS project commissioning and capacity milestone reports</li>
          <li>Lithium and critical mineral pricing trends affecting battery economics</li>
          <li>Sodium-ion and next-generation chemistry production scaling announcements</li>
        </ul>
      </div>
    </section>

    <!-- Sources -->
    <section class="mb-12 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-4">Sources</h2>
      <ul class="flex flex-col gap-2 text-body-sm text-muted list-disc pl-5">
${sourcesList || '        <li>Sources could not be fetched for this edition. Verify manually before publishing.</li>'}
      </ul>
    </section>

    <!-- FAQ -->
    <FAQSection items={faqItems} />

    <!-- Disclaimer -->
    <section class="mb-16 border-t border-hairline pt-12">
      <div class="bg-surface-elevated border border-hairline p-6">
        <h3 class="text-title-lg text-primary mb-3">Disclaimer</h3>
        <p class="text-body-sm text-muted">
          This article summarizes publicly available news and analysis. BatteryCalculators.com does not guarantee the accuracy of third-party information. Always verify facts with primary sources before making engineering or procurement decisions. This content is provided for informational purposes only and does not constitute professional engineering advice.
        </p>
      </div>
    </section>

  </article>
</Layout>
`;

  return page;
}

function escapeJSX(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Main ───
async function main() {
  const { year, week } = parseArgs();
  const dateRange = getWeekDateRange(year, week);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  console.log(`\n🔋 Battery Industry Weekly Generator`);
  console.log(`   Year: ${year}, Week: ${week}`);
  console.log(`   Date Range: ${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`);
  console.log('');

  // Load sources
  const sourcesPath = join(ROOT, 'data', 'news-sources.json');
  let sources;
  try {
    sources = JSON.parse(readFileSync(sourcesPath, 'utf-8'));
  } catch (err) {
    console.error(`❌ Could not load ${sourcesPath}: ${err.message}`);
    process.exit(1);
  }

  // Fetch RSS feeds
  console.log('📡 Fetching RSS feeds...');
  let allStories = [];

  for (const feed of sources.rssFeeds) {
    const items = await fetchRSSFeed(feed);
    if (items.length > 0) {
      console.log(`  ✓ ${feed.name}: ${items.length} items`);
    }
    allStories.push(...items);
  }

  // Add manual sources
  if (sources.manualSources && sources.manualSources.length > 0) {
    console.log(`\n📋 Adding ${sources.manualSources.length} manual source(s)...`);
    for (const ms of sources.manualSources) {
      allStories.push({
        title: ms.title,
        link: ms.url || '',
        pubDate: ms.date || '',
        summary: ms.summary || 'Manual source entry.',
        source: ms.source || 'Manual',
        category: ms.category || 'research',
      });
    }
  }

  console.log(`\n📊 Total stories collected: ${allStories.length}`);

  // Deduplicate
  const uniqueStories = deduplicateStories(allStories);
  console.log(`📊 After deduplication: ${uniqueStories.length}`);

  // Categorize
  const categorized = {};
  for (const story of uniqueStories) {
    categorized[story.title] = categorizeStory(story);
  }

  // Select top stories
  const topStories = selectTopStories(uniqueStories, 10);
  console.log(`📊 Top stories selected: ${topStories.length}`);

  if (topStories.length === 0) {
    console.log('\n⚠ No stories could be fetched. Generating draft with placeholder content.');
    // Generate minimal placeholder stories
    for (let i = 0; i < 3; i++) {
      topStories.push({
        title: `Battery Industry Update — Placeholder Story ${i + 1}`,
        link: '',
        pubDate: todayStr,
        summary: 'Details limited from source; verify before publishing. RSS feeds may have been unavailable during generation.',
        source: 'Draft',
        category: 'research',
      });
      categorized[topStories[i].title] = 'research';
    }
  }

  // Generate article page
  const articleContent = generateArticlePage({
    year, week, dateRange, topStories, categorized, today, todayStr,
  });

  // Write file
  const outputDir = join(ROOT, 'src', 'pages', 'news');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = join(outputDir, `battery-industry-weekly-${year}-week-${week}.astro`);
  writeFileSync(outputPath, articleContent, 'utf-8');

  console.log(`\n✅ Article generated: src/pages/news/battery-industry-weekly-${year}-week-${week}.astro`);
  console.log(`   Route: /news/battery-industry-weekly-${year}-week-${week}`);
  console.log('');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
