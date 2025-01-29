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

// コンピュータープレイヤーのカード予想
export const computerGuess = (gameState: GameState, targetPlayer: Player, cardIndex: number): { suit: Card['suit'], number: number } | null => {
  return makeStrategicGuess(gameState, targetPlayer, cardIndex);
}; 