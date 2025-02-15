import { useState, useCallback } from 'react';
import { GameState, Player, Card, PersonalityType, SkillLevel } from '../types/game';
import { shuffleCards } from '../utils/cardUtils';

interface UseGameStateProps {
  initialPlayerName?: string;
  computerSettings?: {
    [key: number]: {
      skillLevel: SkillLevel;
      personalityType: PersonalityType;
    }
  };
}

export const useGameState = ({ initialPlayerName = 'プレイヤー1', computerSettings }: UseGameStateProps = {}) => {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    gameStatus: 'waiting',
    winner: null,
    logs: [],
    eliminationOrder: []
  });

  const initializePlayers = useCallback((playerName: string) => {
    // カードデッキを作成
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const numbers = Array.from({ length: 13 }, (_, i) => i + 1);
    const allCards = suits.flatMap(suit =>
      numbers.map(number => ({ suit, number, isRevealed: false }))
    );

    // デッキをシャッフル
    const deck = shuffleCards(allCards);
    
    const defaultSettings: Required<UseGameStateProps>['computerSettings'] = {
      1: { skillLevel: 'beginner' as const, personalityType: 'aggressive' as const },
      2: { skillLevel: 'intermediate' as const, personalityType: 'balanced' as const },
      3: { skillLevel: 'expert' as const, personalityType: 'cautious' as const }
    };

    const settings = computerSettings || defaultSettings;
    
    const players: Player[] = [
      {
        id: 0,
        name: playerName,
        cards: deck.slice(0, 13),
        isComputer: false
      },
      {
        id: 1,
        name: 'Computer 1',
        cards: deck.slice(13, 26),
        isComputer: true,
        personalityType: settings[1].personalityType,
        skillLevel: settings[1].skillLevel
      },
      {
        id: 2,
        name: 'Computer 2',
        cards: deck.slice(26, 39),
        isComputer: true,
        personalityType: settings[2].personalityType,
        skillLevel: settings[2].skillLevel
      },
      {
        id: 3,
        name: 'Computer 3',
        cards: deck.slice(39, 52),
        isComputer: true,
        personalityType: settings[3].personalityType,
        skillLevel: settings[3].skillLevel
      }
    ];

    return players;
  }, [computerSettings]);

  const resetGame = useCallback(() => {
    setGameState({
      players: initializePlayers(initialPlayerName),
      currentPlayerIndex: 0,
      gameStatus: 'waiting',
      winner: null,
      logs: [],
      eliminationOrder: []
    });
  }, [initialPlayerName, initializePlayers]);

  const updateGameState = useCallback((newState: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...newState }));
  }, []);

  return {
    gameState,
    resetGame,
    updateGameState,
    initializePlayers
  };
}; 