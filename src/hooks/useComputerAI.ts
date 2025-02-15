import { useCallback } from 'react';

import { Player, GameState } from '../types/game';
import { ComputerAction } from '../types/models/computer';

import { makeStrategicGuess, decideToContinue } from '../utils/computerStrategy';

class ComputerAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComputerAIError';
  }
}

export const useComputerAI = () => {
  const calculateComputerAction = useCallback((
    currentPlayer: Player,
    targetPlayer: Player,
    gameState: GameState
  ): ComputerAction => {
    if (!targetPlayer || !targetPlayer.cards) {
      throw new ComputerAIError('Invalid target player: Player or cards are undefined');
    }

    // 最初の未公開カードのインデックスを見つける
    const cardIndex = targetPlayer.cards.findIndex(card => !card.isRevealed);
    if (cardIndex === -1) {
      throw new ComputerAIError(`No unrevealed cards found for player: ${targetPlayer.name}`);
    }

    // コンピューターの予想を生成
    const guess = makeStrategicGuess(gameState, targetPlayer, cardIndex);
    if (!guess) {
      throw new ComputerAIError(`Failed to generate computer guess for player: ${currentPlayer.name}`);
    }

    // 予想が正しいかチェック
    const targetCard = targetPlayer.cards[cardIndex];
    if (!targetCard) {
      throw new ComputerAIError(`Card not found at index ${cardIndex} for player: ${targetPlayer.name}`);
    }

    const isCorrect = targetCard.suit === guess.suit && targetCard.number === guess.number;

    // プレイヤーの状態を更新
    const updatedPlayers = [...gameState.players];
    const targetPlayerIndex = gameState.players.findIndex(p => p.id === targetPlayer.id);
    if (targetPlayerIndex === -1) {
      throw new ComputerAIError(`Target player not found in game state: ${targetPlayer.name}`);
    }
    
    if (isCorrect) {
      // カードを表にする
      updatedPlayers[targetPlayerIndex] = {
        ...targetPlayer,
        cards: targetPlayer.cards.map((card, index) =>
          index === cardIndex ? { ...card, isRevealed: true } : card
        )
      };
    }

    // 次のプレイヤーを決定
    const currentIndex = gameState.players.findIndex(p => p.id === currentPlayer.id);
    if (currentIndex === -1) {
      throw new ComputerAIError(`Current player not found in game state: ${currentPlayer.name}`);
    }

    const nextPlayerIndex = isCorrect ? currentIndex : (currentIndex + 1) % gameState.players.length;

    // 続けるかどうかを決定
    const willContinue = isCorrect && decideToContinue(currentPlayer, gameState);

    return {
      player: currentPlayer.name,
      targetPlayer: targetPlayer.name,
      cardIndex,
      guessedCard: guess,
      isCorrect,
      updatedPlayers,
      nextPlayerIndex,
      willContinue
    };
  }, []);

  return {
    calculateComputerAction
  };
}; 