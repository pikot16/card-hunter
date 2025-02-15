# リファクタリング ToDo

## コンポーネントの分割

### 1. App.tsx の分割
- [x] 以下のコンポーネントファイルは作成済み（実装の移行はこれから）
  - `src/components/game/GameSetup.tsx`
  - `src/components/game/GameBoard.tsx`
  - `src/components/game/GuessDialog.tsx`
  - `src/components/game/ComputerActionDialog.tsx`
  - `src/components/game/GameLogs.tsx`
  - `src/components/game/GameEndScreen.tsx`

- [ ] 各コンポーネントの実装を移行
  - [ ] GameSetup: ゲーム開始前の設定画面
  - [ ] GameBoard: ゲームのメインボード
  - [ ] GuessDialog: カード予想時のダイアログ
  - [ ] ComputerActionDialog: コンピュータの行動表示
  - [ ] GameLogs: ゲームログの表示
  - [ ] GameEndScreen: ゲーム終了時の画面

### 2. App.css の分割
- [x] 以下のスタイルファイルは作成済み（スタイルの移行はこれから）
  - `src/styles/components/GameSetup.css`
  - `src/styles/components/GameBoard.css`
  - `src/styles/components/GuessDialog.css`
  - `src/styles/components/ComputerActionDialog.css`
  - `src/styles/components/GameLogs.css`
  - `src/styles/components/GameEndScreen.css`
  - `src/styles/components/index.css`

- [ ] 各コンポーネントのスタイルを対応するCSSファイルに移行
- [ ] 共通のスタイルを適切に分類・整理

## リファクタリング手順

1. 準備
   - [ ] 現状のコードをバックアップ（git commit）
   - [ ] テスト環境の準備

2. コンポーネントの移行（各コンポーネントについて）
   - [ ] 新しいコンポーネントをインポート
   - [ ] propsとstate管理の設定
   - [ ] 動作確認
   - [ ] 元のコードの削除

3. スタイルの移行
   - [ ] コンポーネント固有のスタイルを対応するCSSファイルに移動
   - [ ] 共通スタイルの整理
   - [ ] スタイルの適用確認

4. 最終確認
   - [ ] 全体の動作テスト
   - [ ] パフォーマンスチェック
   - [ ] コードの整理・クリーンアップ

## 注意点
1. 各ステップで必ずアプリケーションの動作確認を行う
2. コンポーネント間の依存関係に注意
3. 状態管理（state）の扱いに注意
4. スタイルの競合に注意

## 期待される効果
1. コードの保守性向上
2. コンポーネントの再利用性向上
3. 開発効率の向上
4. バグの特定・修正が容易に 