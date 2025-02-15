import React from 'react';
import { Player, Card as CardType } from '../../types/game';
import Card from '../Card';

interface GameBoardProps {
  players: Player[];
  currentPlayerIndex: number;
  onCardSelect: (playerIndex: number, cardIndex: number) => void;
  selectedCard: {
    playerIndex: number;
    cardIndex: number;
    revealedCardIndex?: number;
    revealedPlayerIndex?: number;
  } | null;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  players,
  currentPlayerIndex,
  onCardSelect,
  selectedCard
}) => {
  const getPlayerStatus = (player: Player, index: number) => {
    if (player.cards.every(card => card.isRevealed)) {
      return '(脱落)';
    }
    if (index === currentPlayerIndex) {
      return '(手番)';
    }
    return '';
  };

  return (
    <div className="game-board">
      {players.map((player, playerIndex) => (
        <div
          key={player.id}
          className={`player-section ${playerIndex === currentPlayerIndex ? 'current-player' : ''}`}
        >
          <h2>
            {player.name} {getPlayerStatus(player, playerIndex)}
          </h2>
          <div className="card-container">
            {player.cards.map((card, cardIndex) => (
              <div
                key={cardIndex}
                className={`card-index ${
                  selectedCard?.playerIndex === playerIndex &&
                  selectedCard?.cardIndex === cardIndex
                    ? 'target'
                    : ''
                }`}
              >
                <Card
                  card={card}
                  isHidden={!card.isRevealed}
                  onClick={() => onCardSelect(playerIndex, cardIndex)}
                  isSelected={
                    selectedCard?.playerIndex === playerIndex &&
                    selectedCard?.cardIndex === cardIndex
                  }
                  index={cardIndex}
                  isTarget={
                    selectedCard?.playerIndex === playerIndex &&
                    selectedCard?.cardIndex === cardIndex
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}; 