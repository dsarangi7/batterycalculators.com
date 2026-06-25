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
  const dateLabel = `${dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const title = `Battery Industry Weekly Intelligence — ${weekLabel}, ${year}`;
  const metaTitle = `Battery Industry Weekly Intelligence — ${weekLabel} ${year} | Battery Calculators`;
  const metaDescription = `Weekly battery industry intelligence: top stories in EV batteries, marine electrification, grid-scale BESS, battery passport regulation, and research updates for ${dateLabel}.`;
  const canonical = `https://batterycalculators.com/news/battery-industry-weekly-${year}-week-${week}`;
  const slug = `battery-industry-weekly-${year}-week-${week}`;

  const readingTime = Math.max(8, Math.round(topStories.length * 1.5 + 5));

  const faqItems = [
    {
      question: 'What is the Battery Industry Weekly Intelligence?',
      answer: 'It is a curated weekly digest of the most important battery industry news, covering EV batteries, marine electrification, grid-scale energy storage, battery passport regulation, safety, manufacturing, and research breakthroughs. Each edition includes engineering analysis from the BatteryCalculators.com team.',
    },
    {
      question: 'How are stories selected for the weekly digest?',
      answer: 'Stories are sourced from trusted RSS feeds including PV Magazine, Energy Storage News, Electrek, CleanTechnica, Maritime Executive, DNV, IMO, US DOE, and Google News curated searches. The generator deduplicates similar stories, scores them by relevance, and selects the top 10 most impactful stories each week.',
    },
    {
      question: 'Can I use these articles for my own reporting?',
      answer: 'The articles reference publicly available news with source attribution and links. You may reference and quote factual summaries with proper attribution. BatteryCalculators engineering analysis is original content. Always verify facts with primary sources before publishing.',
    },
    {
      question: 'How does this relate to BatteryCalculators tools?',
      answer: 'Each weekly digest links to relevant calculators and learning guides so you can apply engineering formulas to the real-world developments covered in the news. For example, EV battery stories link to our battery sizing and C-rate calculators.',
    },
    {
      question: 'When is the weekly digest published?',
      answer: 'The digest is generated every Friday covering the current week. Run the generator script with the desired year and week number to produce a new edition.',
    },
  ];

  const topStoriesBlock = topStories.map((s, i) => {
    const cat = categorized[s.title] || s.category;
    const catLabel = cat.toUpperCase();
    return `      <div class="bg-surface-card border border-hairline p-6">
        <div class="flex items-start justify-between gap-4 mb-3">
          <span class="text-label-uppercase text-m-blue-light text-[10px] shrink-0">${catLabel}</span>
          <span class="text-caption text-muted shrink-0">${s.source}</span>
        </div>
        <h3 class="text-title-lg text-primary mb-2">${escapeJSX(s.title)}</h3>
        <p class="text-body-sm text-muted mb-3">${escapeJSX(s.summary || 'Details limited from source; verify before publishing.')}</p>
        <div class="flex items-center gap-3 text-caption text-muted">
          ${s.pubDate ? `<span>${escapeJSX(s.pubDate)}</span>` : ''}
          ${s.link ? `<a href="${escapeJSX(s.link)}" class="text-m-blue-light hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">Source →</a>` : ''}
        </div>
      </div>`;
  }).join('\n');

  const evStories = topStories.filter(s => (categorized[s.title] || s.category) === 'ev');
  const marineStories = topStories.filter(s => (categorized[s.title] || s.category) === 'marine');
  const bessStories = topStories.filter(s => (categorized[s.title] || s.category) === 'bess');
  const passportStories = topStories.filter(s => (categorized[s.title] || s.category) === 'passport');
  const researchStories = topStories.filter(s => (categorized[s.title] || s.category) === 'research');
  const recyclingStories = topStories.filter(s => (categorized[s.title] || s.category) === 'recycling');
  const safetyStories = topStories.filter(s => (categorized[s.title] || s.category) === 'safety');
  const mfgStories = topStories.filter(s => (categorized[s.title] || s.category) === 'manufacturing');

  const sourcesList = topStories.filter(s => s.link).map(s =>
    `        <li><a href="${escapeJSX(s.link)}" class="hover:text-primary transition-colors underline underline-offset-2" target="_blank" rel="noopener noreferrer">${escapeJSX(s.title)} — ${escapeJSX(s.source)}</a></li>`
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
  { label: '${escapeJSX(title)}' },
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
  <article class="max-w-4xl mx-auto">

    <!-- Draft Notice -->
    <div class="bg-surface-elevated border border-hairline p-4 mb-8">
      <p class="text-body-sm text-muted">
        <strong class="text-primary">Editorial status:</strong> AI-generated draft. Verify sources before relying on this article.
      </p>
    </div>

    <!-- Article Header -->
    <div class="mb-12 border-b border-hairline pb-8">
      <a href="/news" class="text-label-uppercase text-xs text-muted hover:text-primary transition-colors mb-4 inline-block">&larr; Back to News</a>
      <Breadcrumb items={breadcrumbs} />
      <span class="text-label-uppercase text-m-blue-light text-xs block mb-4">WEEKLY INTELLIGENCE</span>
      <h1 class="text-display-md text-primary mb-4">${escapeJSX(title)}</h1>
      <div class="flex flex-wrap items-center gap-4 text-caption text-muted mb-6">
        <span>Published: ${dateLabel}</span>
        <span>Last Updated: ${todayStr}</span>
        <span>${readingTime} min read</span>
      </div>
      <p class="text-body-md text-body font-light">
        ${escapeJSX(metaDescription)}
      </p>
    </div>

    <!-- Executive Summary -->
    <section class="mb-16">
      <h2 class="text-display-sm text-primary mb-6">Executive Summary</h2>
      <div class="bg-surface-card border border-hairline p-6">
        <p class="text-body-md text-body font-light mb-4">
          This week's battery industry intelligence covers ${topStories.length} major developments across EV batteries, marine electrification, grid-scale energy storage, battery passport regulation, and research breakthroughs. The following analysis highlights the engineering implications of each story for system designers, integrators, and policy stakeholders.
        </p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div class="bg-surface-soft border border-hairline p-4 text-center">
            <span class="text-label-uppercase text-m-blue-light text-[10px] block mb-1">EV</span>
            <span class="text-lg font-bold text-primary">${evStories.length}</span>
          </div>
          <div class="bg-surface-soft border border-hairline p-4 text-center">
            <span class="text-label-uppercase text-m-blue-light text-[10px] block mb-1">MARINE</span>
            <span class="text-lg font-bold text-primary">${marineStories.length}</span>
          </div>
          <div class="bg-surface-soft border border-hairline p-4 text-center">
            <span class="text-label-uppercase text-m-blue-light text-[10px] block mb-1">BESS</span>
            <span class="text-lg font-bold text-primary">${bessStories.length}</span>
          </div>
          <div class="bg-surface-soft border border-hairline p-4 text-center">
            <span class="text-label-uppercase text-m-blue-light text-[10px] block mb-1">RESEARCH</span>
            <span class="text-lg font-bold text-primary">${researchStories.length}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Top 10 Stories -->
    <section class="mb-16">
      <h2 class="text-display-sm text-primary mb-6">Top ${topStories.length} Stories This Week</h2>
      <div class="flex flex-col gap-4">
${topStoriesBlock}
      </div>
    </section>

    <!-- Engineering Trends -->
    <section class="mb-16 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-6">Engineering Trends of the Week</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-surface-card border border-hairline p-6">
          <h3 class="text-title-lg text-primary mb-3">Cell Chemistry Evolution</h3>
          <p class="text-body-sm text-muted">
            The push toward higher energy density continues with solid-state and sodium-ion chemistries gaining momentum. LFP remains dominant for stationary storage due to safety and cycle life advantages. Use our <a href="/tools/c-rate-calculator" class="text-m-blue-light hover:text-primary transition-colors">C-Rate Calculator</a> to compare discharge characteristics across chemistries.
          </p>
        </div>
        <div class="bg-surface-card border border-hairline p-6">
          <h3 class="text-title-lg text-primary mb-3">System Integration Complexity</h3>
          <p class="text-body-sm text-muted">
            As battery systems scale from residential to grid-level, integration challenges around thermal management, BMS communication, and safety systems intensify. Our <a href="/tools/battery-sizing-calculator" class="text-m-blue-light hover:text-primary transition-colors">Battery Sizing Calculator</a> helps engineers right-size systems for their specific application constraints.
          </p>
        </div>
        <div class="bg-surface-card border border-hairline p-6">
          <h3 class="text-title-lg text-primary mb-3">Regulatory Acceleration</h3>
          <p class="text-body-sm text-muted">
            EU battery passport requirements and IMO decarbonization targets are creating compliance deadlines that drive procurement decisions. Review our <a href="/learn/eu-battery-passport-requirements-2026" class="text-m-blue-light hover:text-primary transition-colors">EU Battery Passport Requirements 2026</a> guide for detailed compliance pathways.
          </p>
        </div>
        <div class="bg-surface-card border border-hairline p-6">
          <h3 class="text-title-lg text-primary mb-3">Supply Chain Dynamics</h3>
          <p class="text-body-sm text-muted">
            Raw material pricing and availability continue to shape battery economics. Lithium, cobalt, and nickel supply constraints affect pack-level costs across all segments. Check our <a href="/learn/solar-battery-cost-breakdown-2026" class="text-m-blue-light hover:text-primary transition-colors">Solar Battery Cost Breakdown 2026</a> for current pricing analysis.
          </p>
        </div>
      </div>
    </section>

    <!-- EV Battery Impact -->
    <section class="mb-16 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-6">EV Battery Impact</h2>
      <p class="text-body-md text-body font-light mb-6">
        Electric vehicle battery developments this week have implications for pack sizing, charging infrastructure, and cell supply. Engineers designing EV battery packs should evaluate how new cell chemistries affect energy density and thermal management requirements.
      </p>
      ${evStories.length > 0 ? `
      <div class="flex flex-col gap-4">
${evStories.map(s => `        <div class="bg-surface-card border border-hairline p-4">
          <span class="text-label-uppercase text-m-blue-light text-[10px] block mb-1">${s.source}</span>
          <h4 class="text-title-md text-primary mb-1">${escapeJSX(s.title)}</h4>
          <p class="text-body-sm text-muted">${escapeJSX(s.summary || 'Details limited from source; verify before publishing.')}</p>
        </div>`).join('\n')}
      </div>` : `<p class="text-body-sm text-muted">No major EV battery stories this week.</p>`}
      <p class="text-body-sm text-muted mt-4">
        Calculate pack configurations with our <a href="/tools/battery-pack-calculator" class="text-m-blue-light hover:text-primary transition-colors">Battery Pack Calculator</a> and estimate charging timelines with the <a href="/tools/charging-time-calculator" class="text-m-blue-light hover:text-primary transition-colors">Charging Time Calculator</a>.
      </p>
    </section>

    <!-- Marine Battery Impact -->
    <section class="mb-16 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-6">Marine Battery Impact</h2>
      <p class="text-body-md text-body font-light mb-6">
        Marine electrification continues to accelerate with new ferry projects, hybrid vessel orders, and shore power installations. IMO Carbon Intensity Indicator ratings are driving adoption across commercial fleets.
      </p>
      ${marineStories.length > 0 ? `
      <div class="flex flex-col gap-4">
${marineStories.map(s => `        <div class="bg-surface-card border border-hairline p-4">
          <span class="text-label-uppercase text-m-blue-light text-[10px] block mb-1">${s.source}</span>
          <h4 class="text-title-md text-primary mb-1">${escapeJSX(s.title)}</h4>
          <p class="text-body-sm text-muted">${escapeJSX(s.summary || 'Details limited from source; verify before publishing.')}</p>
        </div>`).join('\n')}
      </div>` : `<p class="text-body-sm text-muted">No major marine battery stories this week.</p>`}
      <p class="text-body-sm text-muted mt-4">
        Size marine battery banks with our <a href="/tools/marine-battery-sizing-calculator" class="text-m-blue-light hover:text-primary transition-colors">Marine Battery Sizing Calculator</a> and evaluate hybrid vessel ROI with the <a href="/tools/hybrid-vessel-roi-calculator" class="text-m-blue-light hover:text-primary transition-colors">Hybrid Vessel ROI Calculator</a>. Learn more at our <a href="/marine" class="text-m-blue-light hover:text-primary transition-colors">Marine hub</a>.
      </p>
    </section>

    <!-- Grid BESS Impact -->
    <section class="mb-16 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-6">Grid-Scale BESS Impact</h2>
      <p class="text-body-md text-body font-light mb-6">
        Utility-scale battery energy storage continues to see record deployment volumes. Projects are getting larger, with multi-hundred-MWh systems becoming standard. Battery system sizing and ROI analysis are critical for project viability.
      </p>
      ${bessStories.length > 0 ? `
      <div class="flex flex-col gap-4">
${bessStories.map(s => `        <div class="bg-surface-card border border-hairline p-4">
          <span class="text-label-uppercase text-m-blue-light text-[10px] block mb-1">${s.source}</span>
          <h4 class="text-title-md text-primary mb-1">${escapeJSX(s.title)}</h4>
          <p class="text-body-sm text-muted">${escapeJSX(s.summary || 'Details limited from source; verify before publishing.')}</p>
        </div>`).join('\n')}
      </div>` : `<p class="text-body-sm text-muted">No major BESS stories this week.</p>`}
      <p class="text-body-sm text-muted mt-4">
        Model BESS economics with our <a href="/tools/bess-roi-calculator" class="text-m-blue-light hover:text-primary transition-colors">BESS ROI Calculator</a> and size systems with the <a href="/tools/battery-sizing-calculator" class="text-m-blue-light hover:text-primary transition-colors">Battery Sizing Calculator</a>.
      </p>
    </section>

    <!-- Battery Passport / Regulation Impact -->
    <section class="mb-16 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-6">Battery Passport &amp; Regulation Impact</h2>
      <p class="text-body-md text-body font-light mb-6">
        EU Battery Regulation compliance deadlines are approaching. Battery passport requirements, carbon footprint declarations, and due diligence obligations are reshaping how batteries are documented and traded.
      </p>
      ${passportStories.length > 0 ? `
      <div class="flex flex-col gap-4">
${passportStories.map(s => `        <div class="bg-surface-card border border-hairline p-4">
          <span class="text-label-uppercase text-m-blue-light text-[10px] block mb-1">${s.source}</span>
          <h4 class="text-title-md text-primary mb-1">${escapeJSX(s.title)}</h4>
          <p class="text-body-sm text-muted">${escapeJSX(s.summary || 'Details limited from source; verify before publishing.')}</p>
        </div>`).join('\n')}
      </div>` : `<p class="text-body-sm text-muted">No major battery passport stories this week.</p>`}
      <p class="text-body-sm text-muted mt-4">
        Generate compliant battery passports with our <a href="/battery-passport-generator" class="text-m-blue-light hover:text-primary transition-colors">Battery Passport Generator</a> and review requirements in our <a href="/learn/eu-battery-passport-requirements-2026" class="text-m-blue-light hover:text-primary transition-colors">EU Battery Passport Requirements 2026</a> guide.
      </p>
    </section>

    <!-- BatteryCalculators Engineering Analysis -->
    <section class="mb-16 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-6">BatteryCalculators Engineering Analysis</h2>
      <div class="bg-surface-card border border-hairline p-6">
        <p class="text-body-md text-body font-light mb-4">
          This week's developments reinforce several key engineering trends that system designers should monitor:
        </p>
        <ul class="flex flex-col gap-3 text-body-sm text-muted list-disc pl-5">
          <li><strong class="text-primary">Pack voltage architecture:</strong> Higher voltage systems (800V+ in EVs, 1500V in BESS) are becoming standard. Use our <a href="/tools/voltage-drop-calculator" class="text-m-blue-light hover:text-primary transition-colors">Voltage Drop Calculator</a> to optimize cable runs at these voltages.</li>
          <li><strong class="text-primary">Cell balancing:</strong> As pack sizes increase, active balancing becomes critical. Our <a href="/tools/parallel-string-calculator" class="text-m-blue-light hover:text-primary transition-colors">Parallel String Calculator</a> helps model string-level behavior.</li>
          <li><strong class="text-primary">Depth of discharge optimization:</strong> New chemistries enable deeper cycling without proportional degradation. Calculate usable capacity with our <a href="/tools/runtime-calculator" class="text-m-blue-light hover:text-primary transition-colors">Runtime Calculator</a>.</li>
          <li><strong class="text-primary">Inverter-battery matching:</strong> As systems grow, inverter selection and battery bank sizing must be tightly coordinated. Use the <a href="/tools/inverter-battery-calculator" class="text-m-blue-light hover:text-primary transition-colors">Inverter Battery Calculator</a> for proper matching.</li>
        </ul>
      </div>
    </section>

    <!-- What to Watch Next Week -->
    <section class="mb-16 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-6">What to Watch Next Week</h2>
      <div class="bg-surface-card border border-hairline p-6">
        <ul class="flex flex-col gap-3 text-body-sm text-muted list-disc pl-5">
          <li>Continued updates on solid-state battery commercialization timelines</li>
          <li>EU Battery Regulation implementation guidance from the European Commission</li>
          <li>New vessel battery system orders and ferry electrification announcements</li>
          <li>Grid-scale BESS project commissioning and capacity milestone reports</li>
          <li>Lithium and critical mineral pricing trends affecting battery economics</li>
          <li>Sodium-ion battery production scaling announcements</li>
        </ul>
      </div>
    </section>

    <!-- Related Calculators -->
    <section class="mb-16 border-t border-hairline pt-12">
      <span class="text-label-uppercase text-muted text-[10px] block mb-4">RELATED CALCULATORS</span>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <a href="/tools/runtime-calculator" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">Runtime Calculator</h4>
          <p class="text-xs text-muted">Calculate battery discharge duration</p>
        </a>
        <a href="/tools/battery-sizing-calculator" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">Battery Sizing Calculator</h4>
          <p class="text-xs text-muted">Right-size battery capacity</p>
        </a>
        <a href="/tools/c-rate-calculator" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">C-Rate Calculator</h4>
          <p class="text-xs text-muted">Calculate charge/discharge rates</p>
        </a>
        <a href="/tools/charging-time-calculator" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">Charging Time Calculator</h4>
          <p class="text-xs text-muted">Estimate charge duration</p>
        </a>
        <a href="/tools/inverter-battery-calculator" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">Inverter Battery Calculator</h4>
          <p class="text-xs text-muted">Match inverter and battery sizing</p>
        </a>
        <a href="/tools/parallel-string-calculator" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">Parallel String Calculator</h4>
          <p class="text-xs text-muted">Model parallel string behavior</p>
        </a>
      </div>
    </section>

    <!-- Related Learning Guides -->
    <section class="mb-16 border-t border-hairline pt-12">
      <span class="text-label-uppercase text-muted text-[10px] block mb-4">RELATED LEARNING GUIDES</span>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="/learn/lifepo4-voltage-chart" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">LiFePO4 Voltage Chart</h4>
          <p class="text-xs text-muted">Voltage reference by SOC</p>
        </a>
        <a href="/learn/lead-acid-voltage-chart" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">Lead-Acid Voltage Chart</h4>
          <p class="text-xs text-muted">Lead-acid voltage by SOC</p>
        </a>
        <a href="/learn/battery-runtime-formula" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">Battery Runtime Formula</h4>
          <p class="text-xs text-muted">Complete runtime calculation reference</p>
        </a>
        <a href="/learn/battery-sizing-formula" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">Battery Sizing Formula</h4>
          <p class="text-xs text-muted">Complete sizing calculation reference</p>
        </a>
        <a href="/learn/eu-battery-passport-requirements-2026" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">EU Battery Passport Requirements 2026</h4>
          <p class="text-xs text-muted">Compliance guide for EU regulation</p>
        </a>
        <a href="/learn/solar-battery-cost-breakdown-2026" class="bg-surface-card border border-hairline p-4 hover:border-primary transition-colors block">
          <h4 class="text-primary font-bold mb-1 text-sm">Solar Battery Cost Breakdown 2026</h4>
          <p class="text-xs text-muted">Current pricing analysis</p>
        </a>
      </div>
    </section>

    <!-- Sources -->
    <section class="mb-16 border-t border-hairline pt-12">
      <h2 class="text-display-sm text-primary mb-6">Sources</h2>
      <ul class="flex flex-col gap-2 text-body-sm text-muted list-disc pl-5">
${sourcesList || '        <li>Sources could not be fetched for this edition. Verify manually before publishing.</li>'}
      </ul>
      <p class="text-caption text-muted mt-4">
        Stories sourced from RSS feeds including PV Magazine, Energy Storage News, Electrek, CleanTechnica, Maritime Executive, MarineLink, DNV, IMO, US DOE, European Commission, and curated Google News searches.
      </p>
    </section>

    <!-- FAQ -->
    <FAQSection items={faqItems} />

    <!-- Engineering Disclaimer -->
    <section class="mb-16 border-t border-hairline pt-12">
      <div class="bg-surface-elevated border border-hairline p-6">
        <h3 class="text-title-lg text-primary mb-3">Engineering Disclaimer</h3>
        <p class="text-body-sm text-muted">
          This article is an AI-generated draft compiled from publicly available RSS feeds and news sources. BatteryCalculators.com does not guarantee the accuracy of third-party information. Always verify facts with primary sources before making engineering or procurement decisions. The BatteryCalculators engineering analysis section represents original analysis based on publicly available information and general engineering principles. This content is provided for informational purposes only and does not constitute professional engineering advice.
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

  console.log(`\n🔋 Battery Industry Weekly Intelligence Generator`);
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
