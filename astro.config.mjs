// @ts-check
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import { collectPublishedPaths } from './scripts/collect-published-paths.mjs';
import { lastmodForUrl, loadPageLastmods } from './scripts/sitemap-lastmod.mjs';
import { redirectRules } from './src/seo/plan.mjs';

// Per-URL dates for @astrojs/sitemap serialize(). The integration then stamps
// sitemap-index.xml with the newest lastmod in each child sitemap.
const pageLastmods = loadPageLastmods();

/** @param {string} page */
function isUtilityOrErrorUrl(page) {
  try {
    return /\/(404|500|cookies|search)\/$/.test(new URL(page).pathname);
  } catch {
    return false;
  }
}

// Astro dev/build must keep using the Astro server entry. `wrangler.toml` points
// `main` at the SEO worker used by `wrangler deploy`, which would replace that
// entry if the Cloudflare adapter read it.
const seoRedirects = () => ({
  name: 'seo-redirects',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const lines = redirectRules(collectPublishedPaths());
      const body = [
        '# Permanent path redirects (301).',
        '# Cloudflare html_handling can only emit 307 for trailing slashes.',
        ...lines,
        '',
      ].join('\n');
      await appendFile(new URL('./_redirects', dir), body);
      // `wrangler deploy` follows .wrangler/deploy/config.json to this generated
      // file, not the root wrangler.toml. Attach the SEO worker here so error
      // URLs are served with a 404/500 status instead of 200.
      const wranglerPath = new URL('./wrangler.json', dir);
      const deployConfig = JSON.parse(await readFile(wranglerPath, 'utf8'));
      const workerPath = fileURLToPath(new URL('./src/worker.ts', import.meta.url));
      deployConfig.main = relative(fileURLToPath(new URL('.', wranglerPath)), workerPath);
      // Keep the apex route that lived on wrangler.toml. The adapter's deploy
      // config is generated from wrangler.astro.toml, which omits it.
      deployConfig.routes = [
        { pattern: 'batterycalculators.com/*', zone_name: 'batterycalculators.com' },
      ];
      deployConfig.assets = {
        ...deployConfig.assets,
        binding: 'ASSETS',
        not_found_handling: '404-page',
        html_handling: 'force-trailing-slash',
        run_worker_first: true,
      };
      await writeFile(wranglerPath, `${JSON.stringify(deployConfig, null, 2)}\n`);
    },
  },
});

// https://astro.build/config
export default defineConfig({
  site: 'https://batterycalculators.com',
  // Single public URL convention: https://batterycalculators.com/<path>/
  // Keeps generated sitemap URLs, canonical URLs, and static-asset output consistent.
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt', 'zh'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      filter: (page) => !isUtilityOrErrorUrl(page),
      serialize(item) {
        const lastmod = lastmodForUrl(item.url, pageLastmods);
        if (!lastmod) return item;
        return { ...item, lastmod };
      },
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          pt: 'pt',
          zh: 'zh-CN',
        },
      },
    }),
    seoRedirects(),
  ],
  // Dev and prerender keep the Astro server. Production `wrangler deploy`
  // reads wrangler.toml, which adds the permanent-redirect worker.
  adapter: cloudflare({ configPath: 'wrangler.astro.toml' }),
  vite: {
    plugins: [tailwind()],
  },
});
