// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://batterycalculators.com',
  integrations: [sitemap()],
  adapter: cloudflare(),
  vite: {
    plugins: [tailwind()],
  },
});
