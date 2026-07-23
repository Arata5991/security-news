// GitHub Pages公開版だけに使う認証ガード(ローカルのnpm start版には含まれない)。
// 未ログインならログイン画面へリダイレクトし、ログイン済みの場合のみ
// ダッシュボード本体(app.js)を読み込む。ログアウトボタンの配線もここで行う。
(async function () {
  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  window.__supabaseClient = client;

  const { data } = await client.auth.getSession();
  if (!data.session) {
    window.location.href = 'https://security-news-beta.vercel.app/';
    return;
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.style.display = '';
    logoutBtn.addEventListener('click', async () => {
      await client.auth.signOut();
      window.location.href = 'https://security-news-beta.vercel.app/';
    });
  }

  // ログイン確認が取れてから初めてダッシュボード本体を読み込む
  const script = document.createElement('script');
  script.src = 'app.js';
  document.body.appendChild(script);
})();
