# セキュリティニュース収集ダッシュボード

個人で毎日利用する、セキュリティニュース・ブログ収集アプリです。

## 起動方法

```
npm install   # 初回のみ
npm start
```

起動後、ブラウザで以下を開いてください。

- ニュース: http://localhost:3000
- ブログ: http://localhost:3000/blog.html

サーバーは常駐し、**1時間ごとに自動で再取得**します。画面右上の「更新」ボタンで手動更新も可能です。

## 機能

- ニュースページ: JVN/JPCERT/IPA/piyolog/Security NEXT/ScanNetSecurity(JP)、Krebs on Security/BleepingComputer/CISA/Dark Reading(US)、NCSC UK(UK)、The Hacker News(GLOBAL)
- ブログページ: eSecurityPlanet/Malwarebytes Labs/Proofpoint/Silverfort/Fortinet(US)、NRIセキュア/IIJ Engineers Blog/JPCERT/CC Eyes/NVC(JP)
- 記事タイトル・本文を自動で日本語に翻訳(Google翻訳の無料APIを利用。RSSに本文が無い場合は記事ページから本文を直接取得)
- キーワードベースでカテゴリ自動分類(脆弱性/ランサムウェア/侵害・被害/マルウェア/フィッシング/政策/その他)、国・カテゴリ・キーワード・期間で絞り込み可能
- 脆弱性記事はCVE番号・CVSSスコア・重大度・対象製品/バージョンを正規表現で自動抽出して詳細に表示
- それ以外の記事はエグゼクティブサマリ+重要な点を機械的に抜粋して表示
- 詳細画面から記事内容についてGemini(Google, 無料枠)に質問できるチャット機能

## Geminiチャット機能を使うには(任意)

1. https://aistudio.google.com/apikey でAPIキーを取得(クレジットカード登録不要の無料枠)
2. `.env.example` を `.env` にコピーし、`GEMINI_API_KEY=` の後にキーを貼り付け
3. サーバーを再起動

設定しない場合、チャット欄にはその旨のメッセージが表示されるだけで、他の機能には影響しません。

## GitHub Pagesでの公開版

このリポジトリはGitHub Pagesでも公開できます。ローカル版との違いは以下の通りです。

- データは**GitHub Actionsが自動収集・翻訳し、リポジトリにコミット**した静的JSON(`docs/data/news.json` / `docs/data/blogs.json`)を配信する方式(サーバー常駐なし)。GitHubのスケジュール実行は間引かれることがあるため毎時実行に設定しているが、実際の更新頻度は概ね2〜3時間に1回程度になる
- 手動「更新」ボタンと**Geminiチャット機能は公開版には含まれません**(APIキーを公開ファイルに埋め込むことになり悪用リスクがあるため。ローカルの`npm start`版でのみ利用可能)
- それ以外(国・カテゴリ・キーワード・期間フィルター、脆弱性の詳細抽出など)はローカル版と同じ

### 有効化手順(初回のみ、手動)

1. リポジトリの `Settings` → `Pages` を開く
2. `Source` を `Deploy from a branch` にし、Branch: `main` / Folder: `/docs` を選択して `Save`
3. `Settings` → `Actions` → `General` → `Workflow permissions` を `Read and write permissions` に設定(Actionsが`docs/`をコミットできるようにするため)
4. `Actions` タブから `Update security news data` を一度手動実行(`Run workflow`)すると、`docs/data/*.json` が生成されてサイトに反映されます

以降は毎時17分に自動実行を試みます(GitHub側の都合で間引かれることがあるため、実際の更新間隔は前後します)。すぐに更新したい場合は、`Actions` タブから同じワークフローを手動実行してください(手動実行は常に確実に動作します)。

## ログイン機能(Supabase / Vercel + GitHub Pages)

GitHub Pages公開版には、Supabaseによるメールアドレス+パスワード認証を付けています(ローカルの`npm start`版には認証はありません)。

ログイン画面(`login-app/`, React + Vite)は**Vercelに単体デプロイ**し(https://security-news-beta.vercel.app/)、ダッシュボード本体は引き続きGitHub Pagesで公開する、2つのドメインをまたぐ構成です。

- 未ログインで GitHub Pages側の `index.html` / `blog.html` を開くと、自動的にVercel側のログイン画面へリダイレクトされます
- ログイン成功後はGitHub Pages側のニュースページへ遷移します
- 各ページ右上に「ログアウト」ボタンがあります(クリックするとVercel側のログイン画面に戻ります)
- **セキュリティ上の理由により、サイト上からの自己登録(サインアップ)はできません。** アカウントはSupabaseダッシュボード(`Authentication` → `Users` → `Add user`)から管理者が手動で作成してください。作成時に「Auto Confirm User」を有効にすると、メール確認なしですぐにログインできます

### Vercelへのデプロイ手順

1. Vercelでこのリポジトリを連携し、プロジェクト設定の `Root Directory` を `login-app` に設定する
2. `Settings` → `Environment Variables` で `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を設定する(値はSupabaseのProject URL / Publishable key。`vercel.json`には含めない)
3. デプロイ後のURLが `https://arata5991-security-news-....vercel.app` のように変わる場合は、`login-app/src/App.jsx` の `DASHBOARD_URL` と `docs/authGuard.js` のリダイレクト先URLを実際のURLに合わせて更新し、再ビルド・再デプロイする

### 構成・注意点

- ログイン画面は `login-app/`(React + Vite)。ビルド出力(`login-app/dist/`)はコミットせず、Vercel側で都度ビルドする
- ローカルで動作確認する場合は `cd login-app && npm run dev` または `npm run build && npm run preview`(ルートの`.env`を共有して読み込む)
- Supabaseの Project URL / Publishable(anon) key は、ローカル用にルートの `.env`(`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`)で管理し`.gitignore`済み。Vercel上ではダッシュボードの環境変数を使用する。Publishable keyはクライアント側に公開される前提のキーのため、ビルド後のJS内に埋め込まれること自体は問題ありません
- GitHub Pages側で使うSupabase設定(`docs/supabaseConfig.js`)を変更した場合は `node scripts/generateSupabaseConfig.js` を再実行してください
- **重要な制限**: GitHub Pagesはサーバーを持たない静的ホスティングのため、このログイン機能は画面遷移のガードであり、`docs/data/*.json` などの静的ファイルはURLを直接指定すれば認証なしでも取得できてしまいます。ニュース記事という性質上、内容自体に機密性はない前提で運用してください

## 構成

- `server.js` — Express APIサーバー(`/api/news*` と `/api/blogs*` の2系統)、cronによる定期更新
- `src/feeds.js` / `src/blogFeeds.js` — 収集対象RSSフィード一覧(国タグ付き)
- `src/collectorFactory.js` — RSS取得・本文スクレイピング・翻訳・カテゴリ分類・キャッシュ管理(ニュース/ブログ共通ロジック)
- `src/translator.js` — 翻訳ラッパー
- `src/articleFetcher.js` — RSSに本文が無い場合の記事ページ本文抽出(Readability)
- `src/categorizer.js` — カテゴリ分類・脆弱性情報(CVE/CVSS等)抽出
- `src/geminiClient.js` — Gemini APIへの質問応答ラッパー
- `public/` — ダッシュボードUI(`index.html`=ニュース、`blog.html`=ブログ、共通の`app.js`/`style.css`)。ローカルサーバー版
- `data/cache.json` / `data/blogCache.json` — 収集済み記事のキャッシュ(自動生成、90日以上前の記事は自動削除。ローカル版専用)
- `docs/` — GitHub Pages公開用の静的サイト(`app.js`/`style.css`は`scripts/buildStaticData.js`実行時に`public/`から自動コピーされるため直接編集しない)
- `docs/authGuard.js` — 未ログイン時にVercel側のログイン画面へリダイレクトし、ログアウト処理を行う(GitHub Pages版のみ)
- `docs/supabaseConfig.js` — Supabaseの接続設定(`scripts/generateSupabaseConfig.js`が生成)
- `login-app/` — ログイン画面のReact + Viteソース(Vercelに単体デプロイ、`vercel.json`でSPAのルーティング設定)
- `scripts/buildStaticData.js` — GitHub Pages用の静的JSON(`docs/data/*.json`)を生成するスクリプト
- `scripts/generateSupabaseConfig.js` — `docs/supabaseConfig.js`を生成するスクリプト
- `.github/workflows/update-pages.yml` — 毎時、上記データ生成スクリプトを実行し`docs/`をコミット・プッシュするGitHub Actions

## 注意事項

- 翻訳には無料の非公式Google翻訳APIを利用しています。アクセスが集中すると一時的に翻訳が失敗することがありますが、その場合は原文がそのまま表示されます。
- カテゴリ分類・脆弱性情報抽出はキーワード/正規表現ベースの簡易判定のため、記事によっては精度が限定的です。
- 情報源を追加・変更したい場合は `src/feeds.js`(ニュース)または `src/blogFeeds.js`(ブログ)を編集してください。
- JavaScriptで動的描画されるサイト(SPA)はRSSが無いと取得できません(例: MNB、Trellixは今回未対応)。
