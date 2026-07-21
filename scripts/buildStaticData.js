// GitHub Pages公開用の静的データ(docs/data/*.json)を生成するスクリプト。
// GitHub Actionsから定期実行される。キャッシュ(docs/data/*Cache.json)を使って
// 前回までに収集・翻訳済みの記事は再翻訳せず、新着分だけを追加収集する。
const fs = require('fs');
const path = require('path');
const { createCollector } = require('../src/collectorFactory');
const newsFeeds = require('../src/feeds');
const blogFeeds = require('../src/blogFeeds');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const DOCS_DATA_DIR = path.join(DOCS_DIR, 'data');

async function buildOne(label, feeds, cacheFileName, outFileName) {
  const collector = createCollector({ feeds, cacheFileName, cacheDir: DOCS_DATA_DIR });
  const result = await collector.refreshAll();
  console.log(`[${label}]`, result);

  const publicData = {
    items: collector.getAllItems({ country: 'ALL' }),
    lastUpdated: collector.getLastUpdated(),
    countryCounts: collector.getCountryCounts(),
    categoryCounts: collector.getCategoryCounts(),
  };
  fs.mkdirSync(DOCS_DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DOCS_DATA_DIR, outFileName),
    JSON.stringify(publicData, null, 2),
    'utf-8'
  );
}

function copyStaticAssets() {
  fs.copyFileSync(
    path.join(__dirname, '..', 'public', 'app.js'),
    path.join(DOCS_DIR, 'app.js')
  );
  fs.copyFileSync(
    path.join(__dirname, '..', 'public', 'style.css'),
    path.join(DOCS_DIR, 'style.css')
  );
}

(async () => {
  await buildOne('ニュース', newsFeeds, 'newsCache.json', 'news.json');
  await buildOne('ブログ', blogFeeds, 'blogsCache.json', 'blogs.json');
  copyStaticAssets();
  console.log('docs/ の静的データを更新しました');
})().catch((err) => {
  console.error('静的データ生成に失敗しました:', err);
  process.exit(1);
});
