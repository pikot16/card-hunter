# カードミステリー 技術仕様書

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
  cards: Card[];
  isComputer: boolean;
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
- [x] ランダム予想アルゴリズム
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
- [ ] 戦略的な予想アルゴリズム

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