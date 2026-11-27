import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { fileToRoute } from '../src/seo/plan.mjs';
import { collectPublishedPaths } from './collect-published-paths.mjs';
import {
  lastmodForUrl,
  loadPageLastmods,
  parseGitNameLog,
  routesFromPageFiles,
} from './sitemap-lastmod.mjs';

test('keeps the newest commit per file and stores UTC ISO dates', () => {
  const log = [
    '2026-03-02T09:00:00+08:00',
    '',
    'src/pages/learn/battery-c-rate-reference.astro',
    '',
    '2026-03-01T09:00:00Z',
    '',
    'src/pages/index.astro',
    'src/pages/learn/battery-c-rate-reference.astro',
    '',
  ].join('\n');
  const dates = parseGitNameLog(log);
  assert.equal(dates.get('src/pages/learn/battery-c-rate-reference.astro'), '2026-03-02T01:00:00.000Z');
  assert.equal(dates.get('src/pages/index.astro'), '2026-03-01T09:00:00.000Z');
});

test('maps page files onto trailing-slash routes', () => {
  const dates = new Map([
    ['src/pages/index.astro', '2026-01-01T00:00:00.000Z'],
    ['src/pages/learn/index.astro', '2026-02-01T00:00:00.000Z'],
    ['src/pages/learn.astro', '2026-04-01T00:00:00.000Z'],
    ['src/pages/zh/tools/runtime-calculator.astro', '2026-03-01T00:00:00.000Z'],
    ['src/pages/[slug].astro', '2026-05-01T00:00:00.000Z'],
  ]);
  const routes = routesFromPageFiles([...dates.keys()], dates);
  assert.equal(routes.get('/'), '2026-01-01T00:00:00.000Z');
  assert.equal(routes.get('/learn/'), '2026-04-01T00:00:00.000Z');
  assert.equal(routes.get('/zh/tools/runtime-calculator/'), '2026-03-01T00:00:00.000Z');
  assert.equal(routes.has('/[slug]/'), false);
});

test('looks up sitemap URLs with or without a trailing slash', () => {
  const routes = new Map([['/learn/', '2026-02-01T00:00:00.000Z']]);
  assert.equal(lastmodForUrl('https://batterycalculators.com/learn/', routes), '2026-02-01T00:00:00.000Z');
  assert.equal(lastmodForUrl('https://batterycalculators.com/learn', routes), '2026-02-01T00:00:00.000Z');
  assert.equal(lastmodForUrl('https://batterycalculators.com/missing/', routes), undefined);
  assert.equal(lastmodForUrl('not a url', routes), undefined);
});

test('every published page uses the last commit that touched its source file', () => {
  const routes = loadPageLastmods();
  const samples = [
    'src/pages/index.astro',
    'src/pages/learn/battery-c-rate-reference.astro',
    'src/pages/zh/tools/runtime-calculator.astro',
    'src/pages/pt/news/battery-industry-weekly-2026-week-29.astro',
  ];
  for (const file of samples) {
    const route = fileToRoute(file);
    const raw = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { encoding: 'utf8' }).trim();
    assert.ok(route, file);
    assert.ok(raw, file);
    assert.equal(routes.get(route), new Date(raw).toISOString(), file);
  }

  for (const path of collectPublishedPaths()) {
    assert.match(routes.get(path) ?? '', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, path);
  }
  assert.ok(new Set(routes.values()).size > 1);
});
