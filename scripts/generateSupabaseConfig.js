// docs/supabaseConfig.js を生成するスクリプト。
// Supabaseの Project URL / Publishable(anon) key は公開されて問題ない値だが、
// ソースコード上では.env管理にしたいため、ビルド時にここで埋め込む。
// Supabaseの設定(URL/キー)を変更したときに手動で再実行する(データ更新のワークフローには含めない)。
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が .env に設定されていません');
  process.exit(1);
}

const outPath = path.join(__dirname, '..', 'docs', 'supabaseConfig.js');
const content = `// このファイルは scripts/generateSupabaseConfig.js により自動生成されます。手動編集しないでください。
window.SUPABASE_URL = ${JSON.stringify(url)};
window.SUPABASE_ANON_KEY = ${JSON.stringify(anonKey)};
`;

fs.writeFileSync(outPath, content, 'utf-8');
console.log('docs/supabaseConfig.js を生成しました');
