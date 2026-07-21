const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const MODEL = 'gemini-3.5-flash';
const MAX_CONTEXT_CHARS = 4000;

// 記事本文を文脈として与え、その内容についての質問にGemini(無料枠)で回答させる
async function askAboutArticle({ title, context, question }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY が設定されていません。.env.example を .env にコピーし、Google AI Studio (https://aistudio.google.com/apikey) で取得したキーを設定してからサーバーを再起動してください。'
    );
  }

  const prompt = `あなたはセキュリティニュースの内容について質問に答えるアシスタントです。
以下は記事のタイトルと本文です。この内容に基づいて、質問に日本語で簡潔に答えてください。
記事に書かれていないことを聞かれた場合は、推測せずに「記事からは分かりません」と答えてください。

---記事タイトル---
${title}

---記事本文---
${context.slice(0, MAX_CONTEXT_CHARS)}
---

質問: ${question}`;

  const res = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, input: prompt }),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini API エラー (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return extractOutputText(data) || '(応答を取得できませんでした)';
}

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

module.exports = { askAboutArticle };
