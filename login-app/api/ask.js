// GitHub Pages公開版のダッシュボードから呼び出されるGeminiチャットの代理API。
// GEMINI_API_KEYをサーバー側(Vercel環境変数)に隠したまま、ブラウザから安全に質問できるようにする。
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MODEL = 'gemini-3.5-flash';
const MAX_CONTEXT_CHARS = 4000;
const ALLOWED_ORIGIN = 'https://arata5991.github.io';

// レスポンスの steps[].content[] にある model_output のテキストブロックを結合する
function extractOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text) {
    return data.output_text;
  }
  const steps = Array.isArray(data.steps) ? data.steps : [];
  const texts = [];
  for (const step of steps) {
    if (step.type === 'model_output' && Array.isArray(step.content)) {
      for (const block of step.content) {
        if (block.type === 'text' && block.text) {
          texts.push(block.text);
        }
      }
    }
  }
  return texts.join('\n').trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY が設定されていません(Vercelの環境変数を確認してください)' });
    return;
  }

  const { title, context, question } = req.body || {};
  if (!question || !context) {
    res.status(400).json({ error: 'question と context は必須です' });
    return;
  }

  const prompt = `あなたはセキュリティニュースの内容について質問に答えるアシスタントです。
以下は記事のタイトルと本文です。この内容に基づいて、質問に日本語で簡潔に答えてください。
記事に書かれていないことを聞かれた場合は、推測せずに「記事からは分かりません」と答えてください。

---記事タイトル---
${title || ''}

---記事本文---
${String(context).slice(0, MAX_CONTEXT_CHARS)}
---

質問: ${question}`;

  try {
    const geminiRes = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: prompt }),
    });

    if (!geminiRes.ok) {
      const text = await geminiRes.text().catch(() => '');
      res.status(502).json({ error: `Gemini API エラー (${geminiRes.status}): ${text.slice(0, 300)}` });
      return;
    }

    const data = await geminiRes.json();
    const answer = extractOutputText(data) || '(応答を取得できませんでした)';
    res.status(200).json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
