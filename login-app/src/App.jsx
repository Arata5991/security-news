import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// ログイン後に遷移するセキュリティニュースページ(既存の静的ダッシュボード)への相対パス
const DASHBOARD_URL = '../index.html';

export default function App() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // 既にログイン済みならフォームを出さずにダッシュボードへ遷移する
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = DASHBOARD_URL;
        return;
      }
      setCheckingSession(false);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = DASHBOARD_URL;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          // メール確認が無効な設定の場合はそのままログイン状態になる
          window.location.href = DASHBOARD_URL;
        } else {
          setInfoMessage(
            '確認メールを送信しました。メール内のリンクを開いて確認を完了してから、ログインしてください。'
          );
        }
      }
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
    if (/User already registered/i.test(message)) {
      return 'このメールアドレスは既に登録されています。';
    }
    if (/Password should be at least/i.test(message)) {
      return 'パスワードは6文字以上で入力してください。';
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
        <h2>{mode === 'login' ? 'ログイン' : '会員登録'}</h2>

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
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {errorMessage && <p className="auth-error">{errorMessage}</p>}
          {infoMessage && <p className="auth-info">{infoMessage}</p>}

          <button type="submit" disabled={loading}>
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '会員登録'}
          </button>
        </form>

        <button
          type="button"
          className="auth-toggle"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setErrorMessage('');
            setInfoMessage('');
          }}
        >
          {mode === 'login' ? 'アカウントをお持ちでない方はこちら(会員登録)' : 'すでにアカウントをお持ちの方はこちら(ログイン)'}
        </button>
      </div>
    </div>
  );
}
