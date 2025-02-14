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
export const computerGuess = (gameState: GameState, targetPlayer: Player, targetCardIndex: number): { suit: Card['suit']; number: number } | null => {
  // makeStrategicGuessを使用して予想を行う
  const strategicGuess = makeStrategicGuess(gameState, targetPlayer, targetCardIndex);
  if (strategicGuess) {
    return strategicGuess;
  }

  // makeStrategicGuessが失敗した場合のフォールバック
  // 全プレイヤーの公開済みカードを収集
  const revealedCards = gameState.players.flatMap(player => 
    player.cards
      .filter(card => card.isRevealed)
      .map(card => ({ suit: card.suit, number: card.number }))
  );

  // まだ公開されていないカードの組み合わせを生成
  const possibleCards: Array<{ suit: Card['suit']; number: number }> = [];
  const suits: Array<Card['suit']> = ['hearts', 'diamonds', 'clubs', 'spades'];
  
  for (let number = 1; number <= 13; number++) {
    for (const suit of suits) {
      // 既に公開されているカードは除外
      if (!revealedCards.some(card => card.suit === suit && card.number === number)) {
        possibleCards.push({ suit, number });
      }
    }
  }

  // 可能なカードがある場合はランダムに1つ選択
  if (possibleCards.length > 0) {
    return possibleCards[Math.floor(Math.random() * possibleCards.length)];
  }

  return null;
}; 