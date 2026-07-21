const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');

const TIMEOUT_MS = 10000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

// RSSに全文が無い場合、記事ページ本文を直接取得してReadabilityで抽出する
async function fetchFullArticleText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article || !article.textContent) return null;
    return article.textContent.replace(/\s+/g, ' ').trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchFullArticleText };
