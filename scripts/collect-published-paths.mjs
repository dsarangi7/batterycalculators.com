import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileToRoute } from '../src/seo/plan.mjs';

/**
 * @param {string} [root]
 * @returns {string[]}
 */
export function collectPublishedPaths(root = 'src/pages') {
  /** @type {string[]} */
  const files = [];
  const walk = (/** @type {string} */ dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.astro')) files.push(path);
    }
  };
  walk(root);
  return files
    .map((file) => fileToRoute(file))
    .filter((route) => typeof route === 'string')
    .sort();
}
