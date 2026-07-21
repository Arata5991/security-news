require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const path = require('path');
const { createCollector } = require('./src/collectorFactory');
const newsFeeds = require('./src/feeds');
const blogFeeds = require('./src/blogFeeds');
const { askAboutArticle } = require('./src/geminiClient');

const PORT = process.env.PORT || 3000;
const app = express();

const newsCollector = createCollector({ feeds: newsFeeds, cacheFileName: 'cache.json' });
const blogCollector = createCollector({ feeds: blogFeeds, cacheFileName: 'blogCache.json' });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function mountCollectorRoutes(basePath, collector) {
  app.get(basePath, (req, res) => {
    const country = req.query.country || 'ALL';
    const items = collector.getAllItems({ country });
    res.json({
      items,
      lastUpdated: collector.getLastUpdated(),
      isRefreshing: collector.isRefreshing(),
      countryCounts: collector.getCountryCounts(),
      categoryCounts: collector.getCategoryCounts(),
    });
  });

  app.get(`${basePath}/:id`, (req, res) => {
    const item = collector.getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: '記事が見つかりません' });
    }
    res.json(item);
  });

  app.post(`${basePath}/refresh`, async (req, res) => {
    const result = await collector.refreshAll();
    res.json(result);
  });

  app.post(`${basePath}/:id/ask`, async (req, res) => {
    const item = collector.getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: '記事が見つかりません' });
    }
    const question = (req.body && req.body.question || '').trim();
    if (!question) {
      return res.status(400).json({ error: '質問を入力してください' });
    }
    try {
      const answer = await askAboutArticle({
        title: item.titleJa,
        context: item.summaryJa,
        question,
      });
      res.json({ answer });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

mountCollectorRoutes('/api/news', newsCollector);
mountCollectorRoutes('/api/blogs', blogCollector);

function runInitialRefresh(name, collector) {
  collector
    .refreshAll()
    .then((r) => console.log(`初回${name}取得完了:`, r))
    .catch((e) => console.error(`初回${name}取得エラー:`, e.message));
}

app.listen(PORT, () => {
  console.log(`セキュリティニュース収集アプリを起動しました: http://localhost:${PORT}`);
  runInitialRefresh('ニュース', newsCollector);
  runInitialRefresh('ブログ', blogCollector);
});

// 1時間ごとに自動更新
cron.schedule('0 * * * *', () => {
  console.log('定期更新を開始します...');
  newsCollector
    .refreshAll()
    .then((r) => console.log('ニュース定期更新完了:', r))
    .catch((e) => console.error('ニュース定期更新エラー:', e.message));
  blogCollector
    .refreshAll()
    .then((r) => console.log('ブログ定期更新完了:', r))
    .catch((e) => console.error('ブログ定期更新エラー:', e.message));
});
