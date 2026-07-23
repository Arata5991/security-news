// GitHub Pages公開版の「更新」ボタンから呼び出される、GitHub Actions収集ワークフローの起動API。
// 実際の収集・翻訳処理はVercelの実行時間に収まらないため、ここではワークフローの起動だけを行い、
// 収集自体は数分後にGitHub Actions側で完了する。
const OWNER = 'Arata5991';
const REPO = 'security-news';
const WORKFLOW_FILE = 'update-pages.yml';
const ALLOWED_ORIGIN = 'https://arata5991.github.io';

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

  const token = process.env.GH_WORKFLOW_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'GH_WORKFLOW_TOKEN が設定されていません(Vercelの環境変数を確認してください)' });
    return;
  }

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'security-news-trigger-refresh',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    );

    if (ghRes.status === 204) {
      res.status(200).json({ ok: true });
      return;
    }

    const text = await ghRes.text().catch(() => '');
    res.status(502).json({ error: `GitHub API エラー (${ghRes.status}): ${text.slice(0, 300)}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
