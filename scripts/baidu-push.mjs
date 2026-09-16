/**
 * Baidu URL push (普通收录 / API提交).
 *
 * Pushes site URLs to Baidu's link-submit API so Baiduspider discovers
 * new/updated pages faster. Submission speeds up crawling but does not
 * guarantee indexing.
 *
 * Usage:
 *   BAIDU_PUSH_SITE=https://batterycalculators.com \
 *   BAIDU_PUSH_TOKEN=your-token-from-ziyuan-baidu-com \
 *   node scripts/baidu-push.mjs [sitemap-url] [max-urls]
 *
 * Defaults: sitemap https://batterycalculators.com/sitemap-0.xml (Baidu does
 * NOT support sitemap index files, so push the direct sitemap file), max 100.
 *
 * Get the token at: 百度搜索资源平台 → 资源提交 → 普通收录 → API提交.
 */
const site = process.env.BAIDU_PUSH_SITE || "https://batterycalculators.com";
const token = process.env.BAIDU_PUSH_TOKEN;
const sitemapUrl =
  process.argv[2] || "https://batterycalculators.com/sitemap-0.xml";
const maxUrls = Number(process.argv[3]) || 100;

if (!token) {
  console.error(
    "Missing BAIDU_PUSH_TOKEN. Get it from ziyuan.baidu.com → 资源提交 → 普通收录 → API提交."
  );
  process.exit(1);
}

const apiUrl = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(
  site
)}&token=${token}`;

const xml = await (await fetch(sitemapUrl)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].trim())
  .filter((u) => u.startsWith(site))
  .slice(0, maxUrls);

if (urls.length === 0) {
  console.error(`No URLs found in ${sitemapUrl}`);
  process.exit(1);
}

const res = await fetch(apiUrl, {
  method: "POST",
  headers: { "Content-Type": "text/plain" },
  body: urls.join("\n"),
});
const result = await res.json();
console.log(`Pushed ${urls.length} URLs from ${sitemapUrl}`);
console.log(JSON.stringify(result));
