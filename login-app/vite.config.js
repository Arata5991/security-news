import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Vercelのドメイン直下にデプロイするため絶対パスでよい
  base: '/',
  // ローカルでビルド・確認する際はプロジェクトルートの.envを共有する
  // (Vercel上でのビルドではVercelダッシュボードで設定した環境変数がそのまま使われる)
  envDir: path.resolve(__dirname, '..'),
  build: {
    outDir: 'dist',
  },
});
