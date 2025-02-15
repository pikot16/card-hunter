import { Suit } from './card';
import { Player } from './player';

export interface CardGuess {
  suit: Suit;
  number: number;
}

export interface ComputerGuess {
  cardIndex: number;
  guess: CardGuess;
}

export interface ComputerAction {
  player: string;
  targetPlayer: string;
  cardIndex: number;
  guessedCard: CardGuess;
  isCorrect: boolean;
  updatedPlayers: Player[];
  nextPlayerIndex: number;
  willContinue: boolean;
} 