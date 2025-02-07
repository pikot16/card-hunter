export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  number: number;
  isRevealed: boolean;
}

export interface Player {
  id: number;
  name: string;
  cards: Card[];
  isComputer: boolean;
  personalityType?: 'aggressive' | 'cautious' | 'balanced';
  skillLevel?: 'beginner' | 'intermediate' | 'expert';
}

export interface GameLog {
  guessingPlayer: string;
  targetPlayer: string;
  cardIndex: number;
  guessedSuit: string;
  guessedNumber: number;
  isCorrect: boolean;
  timestamp: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  gameStatus: 'waiting' | 'playing' | 'finished';
  winner: Player | null;
  logs: GameLog[];
  eliminationOrder: number[];
} 