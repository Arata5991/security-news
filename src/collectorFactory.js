const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { translateText } = require('./translator');
const { fetchFullArticleText } = require('./articleFetcher');
const { categorize, extractVulnInfo } = require('./categorizer');

const parser = new Parser({
  timeout: 15000,
  customFields: { item: [['content:encoded', 'contentEncoded']] },
});
const MAX_ITEMS_PER_FEED = 15;
const MAX_DETAIL_CHARS = 4000;
// RSSの本文がこれより短い場合は記事ページ本文を直接取得しにいく
const FULL_TEXT_FETCH_THRESHOLD = 800;

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function makeId(link, feedId) {
  return crypto.createHash('sha1').update(feedId + '|' + link).digest('hex').slice(0, 16);
}

// RSSフィード一覧を収集するコレクターを作る(ニュース用・ブログ用など用途ごとに独立したキャッシュを持たせる)
// cacheDir省略時は既定の data/ ディレクトリを使う(GitHub Pages用の静的生成スクリプトなどでは別ディレクトリを指定できる)
function createCollector({ feeds, cacheFileName, cacheDir }) {
  const dir = cacheDir || path.join(__dirname, '..', 'data');
  const cacheFile = path.join(dir, cacheFileName);
  let store = loadCache();
  let refreshing = false;

  function loadCache() {
    try {
      const raw = fs.readFileSync(cacheFile, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return { items: {}, lastUpdated: null };
    }
  }

  function saveCache() {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(store, null, 2), 'utf-8');
  }

  async function refreshFeed(feed) {
    const added = [];
    try {
      const parsed = await parser.parseURL(feed.url);
      const entries = (parsed.items || []).slice(0, MAX_ITEMS_PER_FEED);
      for (const entry of entries) {
        const link = entry.link || entry.guid;
        if (!link) continue;
        const id = makeId(link, feed.id);
        if (store.items[id]) continue; // 既存は翻訳済みなのでスキップ

        const titleOriginal = entry.title || '';
        // content:encoded に全文記事が入っていることが多いため、あれば優先して使う(なければ短い抜粋のみ)
        let bodyText = stripHtml(
          entry.contentEncoded || entry.content || entry.contentSnippet || entry.summary || ''
        );
        if (bodyText.length < FULL_TEXT_FETCH_THRESHOLD) {
          const scraped = await fetchFullArticleText(link);
          if (scraped && scraped.length > bodyText.length) {
            bodyText = scraped;
          }
        }
        const summaryOriginal = bodyText.slice(0, MAX_DETAIL_CHARS);

        const isJapaneseSource = feed.country === 'JP';
        const titleJa = isJapaneseSource ? titleOriginal : await translateText(titleOriginal);
        const summaryJa = isJapaneseSource ? summaryOriginal : await translateText(summaryOriginal);

        const category = categorize(`${titleOriginal} ${summaryOriginal}`);
        let vulnInfo = null;
        if (category === 'VULN') {
          vulnInfo = extractVulnInfo(summaryOriginal);
          if (vulnInfo && vulnInfo.affectedInfo && !isJapaneseSource) {
            vulnInfo.affectedInfoJa = await translateText(vulnInfo.affectedInfo);
          } else if (vulnInfo && vulnInfo.affectedInfo) {
            vulnInfo.affectedInfoJa = vulnInfo.affectedInfo;
          }
        }

        const item = {
          id,
          feedId: feed.id,
          source: feed.name,
          country: feed.country,
          category,
          vulnInfo,
          link,
          pubDate: entry.isoDate || entry.pubDate || null,
          titleOriginal,
          titleJa,
          summaryOriginal,
          summaryJa,
          collectedAt: new Date().toISOString(),
        };
        store.items[id] = item;
        added.push(item);
      }
    } catch (err) {
      console.warn(`[collector] ${feed.name} の取得に失敗:`, err.message);
    }
    return added;
  }

  // 90日以上前の記事は削除してキャッシュ肥大化を防ぐ
  function pruneOld() {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    for (const [id, item] of Object.entries(store.items)) {
      const t = item.pubDate ? new Date(item.pubDate).getTime() : 0;
      if (t && t < cutoff) delete store.items[id];
    }
  }

  async function refreshAll() {
    if (refreshing) {
      return { skipped: true };
    }
    refreshing = true;
    try {
      let totalAdded = 0;
      for (const feed of feeds) {
        const added = await refreshFeed(feed);
        totalAdded += added.length;
      }
      store.lastUpdated = new Date().toISOString();
      pruneOld();
      saveCache();
      return { totalAdded, lastUpdated: store.lastUpdated };
    } finally {
      refreshing = false;
    }
  }

  function getAllItems({ country } = {}) {
    let items = Object.values(store.items);
    if (country && country !== 'ALL') {
      items = items.filter((i) => i.country === country);
    }
    items.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
    return items;
  }

  function getItemById(id) {
    return store.items[id] || null;
  }

  function getLastUpdated() {
    return store.lastUpdated;
  }

  function getCountryCounts() {
    const counts = {};
    for (const item of Object.values(store.items)) {
      counts[item.country] = (counts[item.country] || 0) + 1;
    }
    return counts;
  }

  function getCategoryCounts() {
    const counts = {};
    for (const item of Object.values(store.items)) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }

  function isRefreshing() {
    return refreshing;
  }

  return {
    refreshAll,
    getAllItems,
    getItemById,
    getLastUpdated,
    getCountryCounts,
    getCategoryCounts,
    isRefreshing,
  };
}

module.exports = { createCollector };
