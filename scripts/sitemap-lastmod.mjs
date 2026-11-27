import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ensureSlash, fileToRoute } from '../src/seo/plan.mjs';

const PAGE_ROOT = 'src/pages';

/**
 * Page source path → newest committer date, as a UTC ISO string.
 * `git log` is newest-first, so the first time a path appears is its lastmod.
 * @param {string} text
 * @returns {Map<string, string>}
 */
export function parseGitNameLog(text) {
  /** @type {Map<string, string>} */
  const dates = new Map();
  let current = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\d{4}-\d{2}-\d{2}T/.test(line)) {
      const time = Date.parse(line);
      current = Number.isNaN(time) ? '' : new Date(time).toISOString();
      continue;
    }
    if (!current) continue;
    const file = line.replaceAll('\\', '/');
    if (dates.has(file)) continue;
    dates.set(file, current);
  }
  return dates;
}

/**
 * @param {readonly string[]} files repo-relative page paths
 * @param {ReadonlyMap<string, string>} dates
 * @returns {Map<string, string>} trailing-slash route → lastmod
 */
export function routesFromPageFiles(files, dates) {
  /** @type {Map<string, string>} */
  const byRoute = new Map();
  for (const file of files) {
    const route = fileToRoute(file);
    if (!route) continue;
    const date = dates.get(file.replaceAll('\\', '/'));
    if (!date) continue;
    const prev = byRoute.get(route);
    if (!prev || Date.parse(date) > Date.parse(prev)) byRoute.set(route, date);
  }
  return byRoute;
}

/**
 * @param {string} url absolute sitemap URL
 * @param {ReadonlyMap<string, string>} byRoute
 * @returns {string | undefined}
 */
export function lastmodForUrl(url, byRoute) {
  try {
    return byRoute.get(ensureSlash(new URL(url).pathname));
  } catch {
    return undefined;
  }
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listAstroFiles(dir) {
  /** @type {string[]} */
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files.push(...listAstroFiles(path));
    else if (name.endsWith('.astro')) files.push(path);
  }
  return files;
}

/**
 * Last committer date of each page under `src/pages`.
 * One `git log` for the tree; untracked files are left out rather than stamped
 * with the build clock.
 * @param {string} [cwd]
 * @returns {Map<string, string>}
 */
export function loadPageLastmods(cwd = process.cwd()) {
  const files = listAstroFiles(join(cwd, PAGE_ROOT)).map((file) => relative(cwd, file).split(sep).join('/'));
  let log = '';
  try {
    log = execFileSync(
      'git',
      ['-c', 'core.quotepath=false', 'log', '--format=%cI', '--name-only', '--', PAGE_ROOT],
      { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`sitemap lastmod: git history for ${PAGE_ROOT} is unavailable (${message})`);
  }
  const byRoute = routesFromPageFiles(files, parseGitNameLog(log));
  if (byRoute.size === 0) {
    throw new Error(`sitemap lastmod: git history for ${PAGE_ROOT} did not match any pages`);
  }
  return byRoute;
}
