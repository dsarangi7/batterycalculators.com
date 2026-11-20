import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectPublishedPaths } from './collect-published-paths.mjs';
import {
  fileToRoute,
  hrefFor,
  plan,
  redirectRules,
  switcherHref,
} from '../src/seo/plan.mjs';

const published = new Set([
  '/',
  '/learn/',
  '/learn/battery-c-rate-reference/',
  '/pt/learn/',
  '/pt/learn/battery-c-rate-reference/',
  '/zh/',
  '/tools/runtime-calculator/',
  '/zh/tools/runtime-calculator/',
  '/pt/404/',
  '/pt/500/',
  '/404/',
  '/500/',
  '/zh/404/',
  '/zh/500/',
  '/cookies/',
  '/reference/awg-wire-size-chart/',
  '/troubleshooting/battery-dies-fast/',
]);

test('maps page files to trailing-slash routes', () => {
  assert.equal(fileToRoute('src/pages/index.astro'), '/');
  assert.equal(fileToRoute('/workspace/src/pages/learn/index.astro'), '/learn/');
  assert.equal(fileToRoute('src/pages/learn/battery-c-rate-reference.astro'), '/learn/battery-c-rate-reference/');
  assert.equal(fileToRoute('src/pages/zh/tools/runtime-calculator.astro'), '/zh/tools/runtime-calculator/');
  assert.equal(fileToRoute('src/pages/pt/404.astro'), '/pt/404/');
  assert.equal(fileToRoute('src/pages/[slug].astro'), null);
});

test('slashless HTML routes 301 to the trailing-slash URL', () => {
  const decision = plan({ hostname: 'batterycalculators.com', pathname: '/learn' }, published);
  assert.deepEqual(decision, { action: 'redirect', status: 301, pathname: '/learn/', search: '' });
});

test('canonical trailing-slash URLs are served', () => {
  assert.equal(plan({ hostname: 'batterycalculators.com', pathname: '/learn/' }, published).action, 'asset');
  assert.equal(
    plan({ hostname: 'batterycalculators.com', pathname: '/zh/tools/runtime-calculator/' }, published).action,
    'asset',
  );
});

test('index aliases 301 to the directory URL', () => {
  assert.equal(
    plan({ hostname: 'batterycalculators.com', pathname: '/learn/battery-c-rate-reference/index.html' }, published).pathname,
    '/learn/battery-c-rate-reference/',
  );
  assert.equal(
    plan({ hostname: 'batterycalculators.com', pathname: '/learn/index' }, published).pathname,
    '/learn/',
  );
});

test('missing Chinese learn, reference, and troubleshooting URLs 301 to English', () => {
  // This fixture intentionally omits /zh/learn/. The published hub is covered below.
  for (const pathname of [
    '/zh/learn',
    '/zh/learn/',
    '/zh/learn/battery-c-rate-reference',
    '/zh/learn/battery-c-rate-reference/',
    '/zh/reference/awg-wire-size-chart/',
    '/zh/troubleshooting/battery-dies-fast',
  ]) {
    const decision = plan({ hostname: 'batterycalculators.com', pathname }, published);
    assert.equal(decision.action, 'redirect', pathname);
    assert.equal(decision.status, 301, pathname);
  }
  assert.equal(
    plan({ hostname: 'batterycalculators.com', pathname: '/zh/learn/battery-c-rate-reference/' }, published).pathname,
    '/learn/battery-c-rate-reference/',
  );
  assert.equal(plan({ hostname: 'batterycalculators.com', pathname: '/zh/learn/' }, published).pathname, '/learn/');
});

test('published Chinese learn hub stays in Chinese', () => {
  const live = new Set(collectPublishedPaths());
  const zhLearn = [...live].filter((path) => path.startsWith('/zh/learn')).sort();
  assert.deepEqual(zhLearn, ['/zh/learn/']);

  assert.equal(plan({ hostname: 'batterycalculators.com', pathname: '/zh/learn/' }, live).action, 'asset');
  assert.deepEqual(plan({ hostname: 'batterycalculators.com', pathname: '/zh/learn' }, live), {
    action: 'redirect',
    status: 301,
    pathname: '/zh/learn/',
    search: '',
  });
  assert.equal(
    plan({ hostname: 'batterycalculators.com', pathname: '/zh/learn/index' }, live).pathname,
    '/zh/learn/',
  );
  assert.equal(
    plan({ hostname: 'batterycalculators.com', pathname: '/zh/learn/battery-c-rate-reference/' }, live).pathname,
    '/learn/battery-c-rate-reference/',
  );
  assert.equal(
    plan({ hostname: 'batterycalculators.com', pathname: '/zh/reference/awg-wire-size-chart/' }, live).pathname,
    '/reference/awg-wire-size-chart/',
  );
  assert.equal(plan({ hostname: 'batterycalculators.com', pathname: '/learn/' }, live).action, 'asset');
  assert.equal(plan({ hostname: 'batterycalculators.com', pathname: '/pt/learn/' }, live).action, 'asset');
  assert.equal(
    plan({ hostname: 'batterycalculators.com', pathname: '/pt/learn/battery-c-rate-reference/' }, live).action,
    'asset',
  );

  assert.equal(hrefFor('/learn/', 'zh', live), '/zh/learn/');
  assert.equal(hrefFor('/learn/battery-c-rate-reference/', 'zh', live), '/learn/battery-c-rate-reference/');
  assert.equal(switcherHref('/learn/', 'zh', live), '/zh/learn/');
  assert.equal(switcherHref('/zh/learn/', 'en', live), '/learn/');
  assert.equal(switcherHref('/zh/learn/', 'pt', live), '/pt/learn/');

  const rules = redirectRules(live);
  assert.equal(rules.includes('/zh/learn/ /learn/ 301'), false);
  assert.equal(rules.includes('/zh/learn /learn/ 301'), false);
  assert.ok(rules.includes('/zh/learn /zh/learn/ 301'));
  assert.ok(rules.includes('/zh/learn/battery-c-rate-reference/ /learn/battery-c-rate-reference/ 301'));
  assert.equal(rules.some((rule) => rule.startsWith('/learn/ ')), false);
  assert.equal(rules.some((rule) => rule.startsWith('/pt/learn/ ')), false);
});

test('unknown localized URLs are not redirected onto a 404', () => {
  assert.equal(
    plan({ hostname: 'batterycalculators.com', pathname: '/zh/learn/not-a-real-guide/' }, published).action,
    'asset',
  );
});

test('published Chinese pages keep their own slash canonical', () => {
  const decision = plan(
    { hostname: 'batterycalculators.com', pathname: '/zh/tools/runtime-calculator', search: '?q=1' },
    published,
  );
  assert.deepEqual(decision, {
    action: 'redirect',
    status: 301,
    pathname: '/zh/tools/runtime-calculator/',
    search: '?q=1',
  });
});

test('www canonicalizes to the apex in one hop', () => {
  const decision = plan(
    { hostname: 'www.batterycalculators.com', pathname: '/learn', search: '?q=1' },
    published,
  );
  assert.deepEqual(decision, { action: 'redirect', status: 301, pathname: '/learn/', search: '?q=1' });
});

test('extension assets and unknown paths are not redirected', () => {
  assert.equal(plan({ hostname: 'batterycalculators.com', pathname: '/robots.txt' }, published).action, 'asset');
  assert.equal(plan({ hostname: 'batterycalculators.com', pathname: '/sitemap-0.xml' }, published).action, 'asset');
  assert.equal(plan({ hostname: 'batterycalculators.com', pathname: '/missing/' }, published).action, 'asset');
});

test('error documents are not 200 and are not slash-redirected first', () => {
  for (const pathname of ['/404', '/404/', '/404.html', '/500/', '/pt/404/', '/pt/500', '/zh/404/', '/zh/500.html']) {
    const decision = plan({ hostname: 'batterycalculators.com', pathname }, published);
    assert.equal(decision.action, 'error', pathname);
    assert.equal(decision.status, pathname.includes('500') ? 500 : 404, pathname);
  }
  assert.equal(plan({ hostname: 'batterycalculators.com', pathname: '/pt/404/' }, published).assetPath, '/pt/404/');
});

test('internal links avoid unpublished Chinese learn URLs', () => {
  assert.equal(hrefFor('/learn/', 'zh', published), '/learn/');
  assert.equal(hrefFor('/learn/battery-c-rate-reference/', 'pt', published), '/pt/learn/battery-c-rate-reference/');
  assert.equal(hrefFor('/tools/runtime-calculator/', 'zh', published), '/zh/tools/runtime-calculator/');
  assert.equal(switcherHref('/learn/battery-c-rate-reference/', 'zh', published), '/zh/');
  assert.equal(switcherHref('/learn/battery-c-rate-reference/', 'pt', published), '/pt/learn/battery-c-rate-reference/');
  assert.equal(switcherHref('/zh/tools/runtime-calculator/', 'en', published), '/tools/runtime-calculator/');
});

test('redirect file stays within the Workers static rule limit', () => {
  const rules = redirectRules(published);
  assert.ok(rules.length < 2000);
  assert.ok(rules.includes('/learn /learn/ 301'));
  assert.ok(rules.includes('/zh/learn/ /learn/ 301'));
  assert.ok(rules.includes('/zh/learn/battery-c-rate-reference/ /learn/battery-c-rate-reference/ 301'));
  assert.equal(rules.some((rule) => rule.startsWith('/zh/tools/runtime-calculator/ ')), false);
});

test('checked-in published paths match the page tree', () => {
  const committed = JSON.parse(readFileSync(new URL('../src/seo/published-paths.json', import.meta.url), 'utf8'));
  assert.deepEqual(committed, collectPublishedPaths());
});
