// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://batterycalculators.com',
  // Single public URL convention: https://batterycalculators.com/<path>/
  // Keeps generated sitemap URLs, canonical URLs, and static-asset output consistent.
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
  adapter: cloudflare(),
  vite: {
    plugins: [tailwind()],
  },
});
