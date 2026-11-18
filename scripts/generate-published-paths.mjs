import { writeFileSync } from 'node:fs';
import { collectPublishedPaths } from './collect-published-paths.mjs';

const paths = collectPublishedPaths();
writeFileSync(new URL('../src/seo/published-paths.json', import.meta.url), `${JSON.stringify(paths, null, 2)}\n`);
console.log(`wrote ${paths.length} published paths`);
