# sudoku

iPhoneでのプレイを想定した数独のWebアプリ。完全クライアントサイドで動作するPWA。

- 難易度3段階(イージー / スタンダード / ハード)。人間的な解法テクニックの必要度で判定
  - イージー: naked/hidden single のみで解ける
  - スタンダード: pairs・box-line reduction 級が必要
  - ハード: triples・X-Wing・XY-Wing 級が必要(論理だけで必ず解ける)
- 問題は端末上でその場で生成(Web Worker、一意解保証)
- 手動メモ+確定時の関連メモ自動削除、アンドゥ/リドゥ、行・列・ブロックの重複表示
- 一手ごとにlocalStorageへ自動保存、起動時に自動復元
- ホーム画面追加で全画面起動、オフライン動作(Service Worker)
- ライト/ダークはOS設定に追従

## 開発

```sh
npm install
npm run dev      # 開発サーバ
npm test         # テスト
npm run build    # 本番ビルド(dist/)
```

`main`へのpushでGitHub Actionsがビルドし、GitHub Pagesへデプロイする。
