// 収集対象のセキュリティニュースRSSフィード一覧
// country: JP / US / UK / GLOBAL
module.exports = [
  { id: 'jvn', name: 'JVN (Japan Vulnerability Notes)', url: 'https://jvn.jp/rss/jvn.rdf', country: 'JP' },
  { id: 'jpcert', name: 'JPCERT/CC', url: 'https://www.jpcert.or.jp/rss/jpcert.rdf', country: 'JP' },
  { id: 'krebs', name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', country: 'US' },
  { id: 'bleepingcomputer', name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', country: 'US' },
  { id: 'cisa', name: 'CISA Advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', country: 'US' },
  { id: 'thehackernews', name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', country: 'GLOBAL' },
  { id: 'darkreading', name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', country: 'US' },
  { id: 'ncsc-uk', name: 'NCSC UK', url: 'https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml', country: 'UK' },
  { id: 'piyolog', name: 'piyolog (piyokango)', url: 'https://piyolog.hatenadiary.jp/rss', country: 'JP' },
  { id: 'security-next', name: 'Security NEXT', url: 'https://www.security-next.com/feed', country: 'JP' },
  { id: 'scan-netsecurity', name: 'ScanNetSecurity', url: 'https://scan.netsecurity.ne.jp/rss/index.rdf', country: 'JP' },
  { id: 'ipa-alert', name: 'IPA 緊急対策情報・注意喚起', url: 'https://www.ipa.go.jp/security/alert-rss.rdf', country: 'JP' },
];
