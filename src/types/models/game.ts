import { Player } from './player';

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface GameLog {
  guessingPlayer: string;
  targetPlayer: string;
  cardIndex: number;
  guessedSuit: string;
  guessedNumber: number;
  isCorrect: boolean;
  timestamp: number;
  willContinue?: boolean;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  gameStatus: GameStatus;
  winner: Player | null;
  logs: GameLog[];
  eliminationOrder: number[];
} 