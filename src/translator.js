const translate = require('google-translate-api-x');

// 短時間に大量リクエストするとブロックされるため直列実行+簡易リトライ
async function translateText(text) {
  if (!text) return '';
  try {
    const result = await translate(text, { to: 'ja' });
    return Array.isArray(result) ? result.map(r => r.text).join(' ') : result.text;
  } catch (err) {
    console.warn('[translator] 翻訳失敗、原文を使用:', err.message);
    return text;
  }
}

module.exports = { translateText };
