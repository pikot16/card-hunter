# カードハンター 仕様書

## 1. システム要件
- 開発環境: TypeScript + React + Vite
- 動作環境: モダンブラウザ（Chrome, Firefox, Safari, Edge）
- 必要なNode.jsバージョン: 16.0.0以上

## 2. データ構造

### 2.1 カード
```typescript
interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  number: number;
  isRevealed: boolean;
}
```

### 2.2 プレイヤー
```typescript
interface Player {
  id: number;
  name: string;
  isComputer: boolean;
  cards: Card[];
}
```

### 2.3 ゲーム状態
```typescript
interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  gameStatus: 'waiting' | 'playing' | 'finished';
  winner: Player | null;
  logs: GameLog[];
}
```

### 2.4 ゲームログ
```typescript
interface GameLog {
  guessingPlayer: string;
  targetPlayer: string;
  cardIndex: number;
  guessedSuit: string;
  guessedNumber: number;
  isCorrect: boolean;
  timestamp: number;
}
```

## 3. 実装状況

### 3.1 実装済み機能
#### コアロジック
- [x] カードの生成と配布
- [x] Fisher-Yatesシャッフルアルゴリズム
- [x] ターン管理システム
- [x] 勝利条件の判定
- [x] ゲームログの記録

#### UI/UX
- [x] プレイヤー入力フォーム
- [x] カード表示コンポーネント
- [x] ゲーム履歴表示
- [x] ダイアログシステム
- [x] レスポンシブレイアウト

#### AI
- [x] コンピュータープレイヤーの基本ロジック
- [x] 戦略的予想アルゴリズム
  - [x] カードの位置による制約の考慮
  - [x] 前後のカードの数字を考慮した予想
  - [x] 確率ベースの予測システム
  - [x] 既存の公開カード情報の活用
- [x] カード公開ロジック

### 3.2 実装予定の機能
#### コアロジック
- [ ] プレイヤー数のカスタマイズ
- [ ] ゲーム設定の保存
- [ ] 統計データの記録

#### UI/UX
- [ ] アニメーション効果
- [ ] サウンドシステム
- [ ] ダークモード
- [ ] モバイル最適化

#### AI
- [ ] 難易度設定
- [ ] 学習型AI（オプション）
- [ ] プレイヤーの行動パターン分析

## 4. コンポーネント構成

### 4.1 メインコンポーネント
- App.tsx: アプリケーションのルートコンポーネント
- GameBoard.tsx: ゲームボード全体の管理
- PlayerSection.tsx: 各プレイヤーの表示領域
- Card.tsx: カードの表示コンポーネント

### 4.2 ユーティリティ
- cardUtils.ts: カード関連のユーティリティ関数
- gameUtils.ts: ゲームロジック関連の関数
- types.ts: 型定義ファイル

## 5. 状態管理
- ローカルステート: React useState
- 永続化: LocalStorage（予定）

## 6. パフォーマンス最適化
- メモ化によるレンダリング最適化
- 非同期処理の適切な管理
- アニメーションの最適化

## 7. セキュリティ考慮事項
- XSS対策
- 入力値のバリデーション
- エラーハンドリング

## 8. テスト計画
- ユニットテスト（Jest）
- コンポーネントテスト（React Testing Library）
- E2Eテスト（Cypress）

## 9. 今後の技術的な課題
1. パフォーマンス最適化
2. モバイル対応の改善
3. アクセシビリティ対応
4. ブラウザ互換性の確保

## 10. 開発環境のセットアップ
```bash
# 必要な依存関係
npm install react react-dom typescript vite @types/react @types/react-dom

# 開発用コマンド
npm run dev    # 開発サーバー起動
npm run build  # プロダクションビルド
npm run test   # テスト実行
```

## UI コンポーネント

### ゲームボード
- プレイヤーセクションの表示
  - プレイヤー名
  - 現在のプレイヤーの表示
  - カードの表示（13枚）
  - 予想対象プレイヤーの表示

### カード選択ダイアログ
- ドラッグ可能なヘッダー付きダイアログ
- スート選択
  - ♥, ♦, ♣, ♠ の記号表示
  - 赤/黒の色分け
- 数字選択（A-K）
- キャンセル・戻るボタン

### ゲーム履歴
- 連番付きエントリー
- プレイヤー名の強調表示
- カードシンボルの視覚的表示
- 2行レイアウト
  - 1行目: プレイヤー情報
  - 2行目: カード予想と結果
- 結果表示（○/×）

## ゲームロジック

### ゲーム開始
1. プレイヤー名の入力
2. 4人のプレイヤー設定（1人のユーザーと3人のコンピュータ）
3. カードの配布（各プレイヤーに13枚）

### ターンの進行
1. プレイヤーの選択
   - 人間プレイヤー: 任意のカードを選択
   - コンピュータ: ランダムに選択

2. カード予想
   - 人間プレイヤー: ダイアログで選択
   - コンピュータ: ランダムに予想

3. 結果判定
   - 正解: 相手のカードを表向きに
   - 不正解: 自分のカードを表向きに

### 勝利条件
- 最後まで裏向きのカードを持っているプレイヤーが勝利
- 全プレイヤーのカードが表向きになった場合は引き分け 