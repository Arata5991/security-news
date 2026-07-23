import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // GitHub Pagesのどの階層に置かれても動くよう相対パスでビルドする
  base: './',
  // プロジェクトルートの .env を共有して読み込む(login-app専用の.envは作らない)
  envDir: path.resolve(__dirname, '..'),
  build: {
    outDir: path.resolve(__dirname, '..', 'docs', 'login'),
    emptyOutDir: true,
  },
});
