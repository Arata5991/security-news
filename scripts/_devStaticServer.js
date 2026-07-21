// docs/ 配下をローカル確認するための使い捨て静的サーバー(本番では使わない)
const express = require('express');
const path = require('path');
const app = express();
app.use(express.static(path.join(__dirname, '..', 'docs')));
app.listen(4000, () => console.log('docs/ preview: http://localhost:4000'));
