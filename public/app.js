const API_BASE = window.API_BASE || '/api/news';
const STATIC_MODE = !!window.STATIC_MODE;
const DATA_URL = window.DATA_URL || null;
// 静的公開版(GitHub Pages)でGemini質問・手動更新を使う場合の、Vercel上のプロキシAPIのURL
const ASK_API_URL = window.ASK_API_URL || null;
const REFRESH_TRIGGER_URL = window.REFRESH_TRIGGER_URL || null;

const COUNTRY_LABELS = {
  JP: '🇯🇵 日本',
  US: '🇺🇸 米国',
  UK: '🇬🇧 英国',
  GLOBAL: '🌐 グローバル',
};

const CATEGORY_LABELS = {
  VULN: '🛠️ 脆弱性',
  RANSOMWARE: '💀 ランサムウェア',
  INCIDENT: '🚨 侵害・被害',
  MALWARE: '🦠 マルウェア/攻撃',
  PHISHING: '🎣 フィッシング',
  POLICY: '📜 政策・規制',
  OTHER: '📰 その他',
};

const grid = document.getElementById('news-grid');
const lastUpdatedEl = document.getElementById('last-updated');
const refreshBtn = document.getElementById('refresh-btn');
const tabs = document.querySelectorAll('#country-tabs .tab');
const categoryTabs = document.querySelectorAll('#category-tabs .tab');
const modal = document.getElementById('detail-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const modalBackdrop = document.getElementById('modal-backdrop');
const searchInput = document.getElementById('search-input');
const dateFromInput = document.getElementById('date-from');
const dateToInput = document.getElementById('date-to');
const clearFiltersBtn = document.getElementById('clear-filters-btn');

let currentCountry = 'ALL';
let currentCategory = 'ALL';
let rawItems = [];

function formatDate(iso) {
  if (!iso) return '日時不明';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '日時不明';
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderCards(items) {
  if (!items.length) {
    grid.innerHTML = '<p class="empty">該当する記事がありません。</p>';
    return;
  }
  grid.innerHTML = '';
  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-meta">
        <span class="country-tag ${item.country}">${COUNTRY_LABELS[item.country] || item.country}</span>
        <span class="category-tag ${item.category}">${CATEGORY_LABELS[item.category] || item.category}</span>
        <span>${item.source}</span>
        <span>・${formatDate(item.pubDate)}</span>
      </div>
      <h3 class="card-title">${escapeHtml(item.titleJa)}</h3>
      <p class="card-summary">${escapeHtml(item.summaryJa)}</p>
    `;
    card.addEventListener('click', () => openDetail(item));
    grid.appendChild(card);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function buildVulnPanel(item) {
  const v = item.vulnInfo;
  if (!v) return '';
  const shortSummary = item.summaryJa.length > 150 ? `${item.summaryJa.slice(0, 150)}…` : item.summaryJa;
  const cveHtml = v.cveIds && v.cveIds.length
    ? v.cveIds.map((id) => `<span class="cve-badge">${escapeHtml(id)}</span>`).join('')
    : '該当なし';
  return `
    <div class="vuln-panel">
      <div class="vuln-row"><span class="label">サマリ</span><span class="value">${escapeHtml(shortSummary)}</span></div>
      <div class="vuln-row"><span class="label">対象製品・バージョン</span><span class="value">${escapeHtml(v.affectedInfoJa) || '特定できませんでした(元記事をご確認ください)'}</span></div>
      <div class="vuln-row"><span class="label">CVE</span><span class="value">${cveHtml}</span></div>
      ${v.cvssScore ? `<div class="vuln-row"><span class="label">CVSSスコア</span><span class="value">${escapeHtml(v.cvssScore)}</span></div>` : ''}
      ${v.severity ? `<div class="vuln-row"><span class="label">重大度</span><span class="value">${escapeHtml(v.severity)}</span></div>` : ''}
    </div>
  `;
}

// 文分割(日本語の句点・英語の終止符に対応)
function splitSentences(text) {
  return (text || '')
    .split(/(?<=[。！?!.])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const IMPORTANCE_KEYWORDS =
  /影響|被害|流出|漏えい|漏洩|攻撃|感染|侵害|実行|修正|公開|悪用|標的|要求|身代金|顧客|ユーザー|記録|発表|確認|報告|停止|障害|窃取|盗まれ|拡散|摘発|逮捕|罰金|規制|義務/;

function scoreSentence(sentence) {
  let score = 0;
  if (/[0-9]/.test(sentence)) score += 2;
  if (/\$|ドル|円|USD/.test(sentence)) score += 1;
  if (/\d{4}年|\d+月\d+日/.test(sentence)) score += 1;
  if (IMPORTANCE_KEYWORDS.test(sentence)) score += 2;
  const len = sentence.length;
  if (len >= 20 && len <= 150) score += 1;
  if (len < 8) score -= 3;
  return score;
}

// AIを使わない機械的な抜粋: 最初の文=エグゼクティブサマリ、残りをスコアリングして上位を「重要な点」とする
function extractKeyPoints(text, maxPoints = 4) {
  const sentences = splitSentences(text);
  if (!sentences.length) return { executiveSummary: '', keyPoints: [] };
  const executiveSummary = sentences[0];
  const rest = sentences.slice(1);
  const scored = rest.map((s, idx) => ({ text: s, idx, score: scoreSentence(s) }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, maxPoints).filter((t) => t.score > 0);
  top.sort((a, b) => a.idx - b.idx);
  return { executiveSummary, keyPoints: top.map((t) => t.text) };
}

function buildSummaryPanel(item) {
  const { executiveSummary, keyPoints } = extractKeyPoints(item.summaryJa);
  if (!executiveSummary) return '';
  const pointsHtml = keyPoints.length
    ? `<ul class="key-points">${keyPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
    : '<span class="value">(追加の重要ポイントは検出されませんでした)</span>';
  return `
    <div class="vuln-panel">
      <div class="vuln-row"><span class="label">エグゼクティブサマリ</span><span class="value">${escapeHtml(executiveSummary)}</span></div>
      <div class="vuln-row"><span class="label">重要な点</span>${pointsHtml}</div>
    </div>
  `;
}

function appendChatMessage(container, role, text) {
  const el = document.createElement('div');
  el.className = `chat-msg chat-msg-${role}`;
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

function wireChatForm(item) {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  if (!chatForm) return;

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = chatInput.value.trim();
    if (!question) return;

    appendChatMessage(chatMessages, 'user', question);
    chatInput.value = '';
    chatInput.disabled = true;
    const thinkingEl = appendChatMessage(chatMessages, 'assistant', '考え中...');

    try {
      const askUrl = STATIC_MODE ? ASK_API_URL : `${API_BASE}/${item.id}/ask`;
      const body = STATIC_MODE
        ? { question, title: item.titleJa, context: item.summaryJa }
        : { question };
      const res = await fetch(askUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      thinkingEl.textContent = data.answer || data.error || '(応答なし)';
    } catch (err) {
      thinkingEl.textContent = `エラー: ${err.message}`;
    }
    chatInput.disabled = false;
    chatInput.focus();
  });
}

function openDetail(item) {
  const chatEnabled = !STATIC_MODE || !!ASK_API_URL;

  // 脆弱性カテゴリでもCVE等が何も抽出できなかった場合は、通常の要約パネルにフォールバックする
  const panelHtml =
    (item.category === 'VULN' && buildVulnPanel(item)) || buildSummaryPanel(item);
  const detailSummaryHtml = panelHtml
    ? `<details class="modal-original"><summary>詳細本文を表示</summary><div class="modal-summary">${escapeHtml(item.summaryJa)}</div></details>`
    : `<div class="modal-summary">${escapeHtml(item.summaryJa)}</div>`;

  modalBody.innerHTML = `
    <h2>${escapeHtml(item.titleJa)}</h2>
    <div class="modal-meta">
      <span class="country-tag ${item.country}">${COUNTRY_LABELS[item.country] || item.country}</span>
      <span class="category-tag ${item.category}">${CATEGORY_LABELS[item.category] || item.category}</span>
      <span>${item.source}</span>
      <span>・${formatDate(item.pubDate)}</span>
    </div>
    ${panelHtml}
    ${detailSummaryHtml}
    <details class="modal-original">
      <summary>原文を表示</summary>
      <p><strong>${escapeHtml(item.titleOriginal)}</strong></p>
      <p>${escapeHtml(item.summaryOriginal)}</p>
    </details>
    <a class="original-link" href="${item.link}" target="_blank" rel="noopener noreferrer">元記事を開く ↗</a>
    ${chatEnabled ? `
    <div class="chat-section">
      <h3 class="chat-title">💬 この記事について質問する(Gemini)</h3>
      <div class="chat-messages" id="chat-messages"></div>
      <form id="chat-form" class="chat-form">
        <input type="text" id="chat-input" placeholder="例: 対象製品は?/影響範囲は?/対策方法は?" autocomplete="off" />
        <button type="submit">送信</button>
      </form>
    </div>
    ` : ''}
  `;
  modal.classList.remove('hidden');
  if (chatEnabled) wireChatForm(item);
}

function closeDetail() {
  modal.classList.add('hidden');
}

modalClose.addEventListener('click', closeDetail);
modalBackdrop.addEventListener('click', closeDetail);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDetail();
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentCountry = tab.dataset.country;
    applyFilters();
  });
});

categoryTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    categoryTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentCategory = tab.dataset.category;
    applyFilters();
  });
});

function applyFilters() {
  const keyword = searchInput.value.trim().toLowerCase();
  const fromValue = dateFromInput.value ? new Date(`${dateFromInput.value}T00:00:00`) : null;
  const toValue = dateToInput.value ? new Date(`${dateToInput.value}T23:59:59`) : null;

  let items = rawItems;

  if (currentCountry !== 'ALL') {
    items = items.filter((item) => item.country === currentCountry);
  }

  if (currentCategory !== 'ALL') {
    items = items.filter((item) => item.category === currentCategory);
  }

  if (keyword) {
    items = items.filter((item) => {
      const haystack = `${item.titleJa} ${item.summaryJa} ${item.source}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }

  if (fromValue || toValue) {
    items = items.filter((item) => {
      if (!item.pubDate) return false;
      const d = new Date(item.pubDate);
      if (fromValue && d < fromValue) return false;
      if (toValue && d > toValue) return false;
      return true;
    });
  }

  renderCards(items);
}

searchInput.addEventListener('input', applyFilters);
dateFromInput.addEventListener('change', applyFilters);
dateToInput.addEventListener('change', applyFilters);
clearFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  dateFromInput.value = '';
  dateToInput.value = '';
  applyFilters();
});

async function loadNews() {
  try {
    const url = STATIC_MODE ? DATA_URL : `${API_BASE}?country=ALL`;
    const res = await fetch(url);
    const data = await res.json();
    rawItems = data.items;
    applyFilters();
    lastUpdatedEl.textContent = data.lastUpdated
      ? `最終更新: ${formatDate(data.lastUpdated)}${data.isRefreshing ? '(更新中...)' : ''}`
      : '最終更新: まだ取得していません';
  } catch (err) {
    grid.innerHTML = `<p class="empty">記事の取得に失敗しました: ${escapeHtml(err.message)}</p>`;
  }
}

if (STATIC_MODE) {
  if (REFRESH_TRIGGER_URL) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'リクエスト中...';
      try {
        const res = await fetch(REFRESH_TRIGGER_URL, { method: 'POST' });
        const data = await res.json().catch(() => ({}));
        refreshBtn.textContent = res.ok
          ? '更新をリクエストしました(数分後に反映)'
          : data.error || '更新リクエストに失敗しました';
      } catch (err) {
        refreshBtn.textContent = '更新リクエストに失敗しました';
      }
      setTimeout(() => {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '更新';
      }, 6000);
    });
  } else {
    refreshBtn.style.display = 'none';
  }
} else {
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '更新中...';
    try {
      await fetch(`${API_BASE}/refresh`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    await loadNews();
    refreshBtn.disabled = false;
    refreshBtn.textContent = '更新';
  });
}

loadNews();

if (!STATIC_MODE) {
  // 初回取得(サーバー起動直後の翻訳処理)が終わるまで数秒おきに自動再読込
  let pollCount = 0;
  const pollTimer = setInterval(() => {
    pollCount += 1;
    loadNews();
    if (pollCount > 20) clearInterval(pollTimer);
  }, 5000);
}
