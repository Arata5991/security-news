import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// ログイン後に遷移するセキュリティニュースページ(GitHub Pages上の既存ダッシュボード)
const DASHBOARD_URL = 'https://arata5991.github.io/security-news/';

// GitHub Pages(別ドメイン)にはこのドメインのセッション(localStorage)が見えないため、
// URLのハッシュにトークンを載せて渡し、向こう側でセッションを再確立してもらう
function redirectToDashboardWithSession(session) {
  const hash = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }).toString();
  window.location.href = `${DASHBOARD_URL}#${hash}`;
}

// セキュリティ上の理由により自己登録(サインアップ)は提供しない。
// アカウントはSupabaseダッシュボードから管理者が手動で発行する。
export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    (async () => {
      // GitHub Pages側の「ログアウト」から戻ってきた場合は、このドメインのセッションも破棄する
      const params = new URLSearchParams(window.location.search);
      if (params.get('logout') === '1') {
        await supabase.auth.signOut();
        history.replaceState(null, '', window.location.pathname);
        setCheckingSession(false);
        return;
      }

      // 既にログイン済みならフォームを出さずにダッシュボードへ遷移する
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        redirectToDashboardWithSession(data.session);
        return;
      }
      setCheckingSession(false);
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      redirectToDashboardWithSession(data.session);
    } catch (err) {
      setErrorMessage(translateError(err.message));
    } finally {
      setLoading(false);
    }
  }

  function translateError(message) {
    if (/Invalid login credentials/i.test(message)) {
      return 'メールアドレスまたはパスワードが正しくありません。';
    }
    return message;
  }

  if (checkingSession) {
    return (
      <div className="auth-page">
        <p className="auth-loading">確認中...</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>🛡️ セキュリティニュース収集</h1>
        <h2>ログイン</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            メールアドレス
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
          </label>

          {errorMessage && <p className="auth-error">{errorMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading ? '処理中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
