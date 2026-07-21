// キーワードベースでニュースをカテゴリ分類する(判定順=優先度順)
const CATEGORY_RULES = [
  { category: 'RANSOMWARE', pattern: /ransomware|ランサムウェア/i },
  { category: 'PHISHING', pattern: /phishing|smishing|business email compromise|\bbec\b|フィッシング|スミッシング/i },
  {
    category: 'VULN',
    pattern: /CVE-\d{4}-\d{4,7}|vulnerabilit|zero-?day|exploit|patch(?:e[sd])?|advisory|remote code execution|\brce\b|buffer overflow|脆弱性|ゼロデイ|アドバイザリ|修正パッチ/i,
  },
  {
    category: 'INCIDENT',
    pattern: /breach(?:ed)?|hacked|data leak|leaked|stolen data|compromised|victim|侵害|流出|漏[ええ]い|漏洩|被害|攻撃を受け/i,
  },
  {
    category: 'MALWARE',
    pattern: /malware|trojan|botnet|\bapt\d*\b|threat actor|backdoor|マルウェア|ボットネット|攻撃キャンペーン|バックドア/i,
  },
  {
    category: 'POLICY',
    pattern: /regulation|legislation|compliance|policy|gdpr|law(?:suit)?|規制|法律|政策|ガイドライン|義務化/i,
  },
];

function categorize(text) {
  if (!text) return 'OTHER';
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) return rule.category;
  }
  return 'OTHER';
}

const SEVERITY_PATTERN = /\b(critical|high|medium|low)\b\s*(?:severity|risk)?/i;
const SEVERITY_PATTERN_JA = /(緊急|重大|重要|高|中|低)(?:レベル|度)?/;

// 脆弱性記事から CVE / CVSS / 重大度 / 対象製品・バージョンらしき一文を best-effort で抽出する
function extractVulnInfo(text) {
  if (!text) return null;

  const cveIds = [...new Set((text.match(/CVE-\d{4}-\d{4,7}/gi) || []).map((s) => s.toUpperCase()))];

  const cvssMatch = text.match(/CVSS[^0-9]{0,20}([0-9]{1,2}(?:\.[0-9])?)/i);
  const cvssScore = cvssMatch ? cvssMatch[1] : null;

  const severityMatch = text.match(SEVERITY_PATTERN) || text.match(SEVERITY_PATTERN_JA);
  const severity = severityMatch ? severityMatch[1] : null;

  const sentences = text.split(/(?<=[。.!?])\s+/);
  const versionSentence = sentences.find((s) => /\bversion\b|\bv?\d+\.\d+(?:\.\d+)?\b|バージョン/i.test(s));
  const affectedInfo = versionSentence ? versionSentence.trim().slice(0, 300) : null;

  if (!cveIds.length && !cvssScore && !severity && !affectedInfo) return null;

  return { cveIds, cvssScore, severity, affectedInfo };
}

module.exports = { categorize, extractVulnInfo };
