import { Card, Player, GameState } from '../types/game'
import { makeStrategicGuess } from './computerStrategy'

export const getDisplayNumber = (number: number): string => {
  switch (number) {
    case 1: return 'A';
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    default: return number.toString();
  }
};

export const shuffleCards = (cards: Card[]): Card[] => {
  const deck = [...cards];
  
  // Fisher-Yates シャッフルアルゴリズム
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
};

// コンピュータの予想ロジック
export const computerGuess = (
  gameState: GameState, 
  targetPlayer: Player, 
  targetCardIndex: number,
  guessingPlayerIndex: number  // 追加：予想を行うプレイヤーのインデックス
): { suit: Card['suit']; number: number } | null => {
  console.log('\n=== computerGuess関数開始 ===');
  console.log('Current Player Index:', gameState.currentPlayerIndex);
  console.log('Current Player:', gameState.players[gameState.currentPlayerIndex].name);
  console.log('Target Player:', targetPlayer.name);
  console.log('Card Index:', targetCardIndex);

  // gameStateのcurrentPlayerIndexを予想を行うプレイヤーのインデックスに設定
  const modifiedGameState = {
    ...gameState,
    currentPlayerIndex: guessingPlayerIndex
  };

  // makeStrategicGuessを使用して予想を行う
  const strategicGuess = makeStrategicGuess(modifiedGameState, targetPlayer, targetCardIndex);
  if (strategicGuess) {
    return strategicGuess;
  }

  // makeStrategicGuessが失敗した場合のフォールバック
  // 全プレイヤーの公開済みカードと予想プレイヤーの全カードを収集
  const excludedCards = gameState.players.flatMap(player => 
    player.cards
      .filter(card => card.isRevealed || player.id === guessingPlayerIndex)  // 予想プレイヤーの全カードを除外
      .map(card => ({ suit: card.suit, number: card.number }))
  );

  // まだ公開されていないカードの組み合わせを生成
  const possibleCards: Array<{ suit: Card['suit']; number: number }> = [];
  const suits: Array<Card['suit']> = ['hearts', 'diamonds', 'clubs', 'spades'];
  
  for (let number = 1; number <= 13; number++) {
    for (const suit of suits) {
      // 除外リストにないカードのみを追加
      if (!excludedCards.some(card => card.suit === suit && card.number === number)) {
        possibleCards.push({ suit, number });
      }
    }
  }

  console.log('=== フォールバック処理 ===');
  console.log('除外されたカード:', excludedCards);
  console.log('可能なカード:', possibleCards);

  // 可能なカードがある場合はランダムに1つ選択
  if (possibleCards.length > 0) {
    const selectedCard = possibleCards[Math.floor(Math.random() * possibleCards.length)];
    console.log('選択されたカード:', selectedCard);
    return selectedCard;
  }

  return null;
}; 