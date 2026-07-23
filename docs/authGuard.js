// GitHub Pages公開版だけに使う認証ガード(ローカルのnpm start版には含まれない)。
// 未ログインならログイン画面(Vercel)へリダイレクトし、ログイン済みの場合のみ
// ダッシュボード本体(app.js)を読み込む。ログアウトボタンの配線もここで行う。
//
// 注意: ログイン画面(Vercel)とこのダッシュボード(GitHub Pages)はドメインが異なるため、
// Supabaseのセッション(localStorage)はそのままでは共有されない。そのためログイン成功時に
// URLのハッシュにトークンを載せて渡してもらい、ここでこのドメイン用のセッションを再確立する。
const LOGIN_URL = 'https://security-news-beta.vercel.app/';

(async function () {
  const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  window.__supabaseClient = client;

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken && refreshToken) {
    await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    // トークンをURL・履歴に残さない
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  const { data } = await client.auth.getSession();
  if (!data.session) {
    window.location.href = LOGIN_URL;
    return;
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.style.display = '';
    logoutBtn.addEventListener('click', async () => {
      await client.auth.signOut();
      // Vercel側のセッションもログイン画面側で破棄してもらう
      window.location.href = `${LOGIN_URL}?logout=1`;
    });
  }

  // ログイン確認が取れてから初めてダッシュボード本体を読み込む
  const script = document.createElement('script');
  script.src = 'app.js';
  document.body.appendChild(script);
})();
