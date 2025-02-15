import React from 'react';
import { Suit, CardNumber } from '../../types/game';
import Draggable from 'react-draggable';

interface GuessDialogProps {
  showSuitDialog: boolean;
  showNumberDialog: boolean;
  selectedSuit: Suit | null;
  position: { x: number; y: number };
  onSuitSelect: (suit: Suit) => void;
  onNumberSelect: (number: CardNumber) => void;
  onCancel: () => void;
  onBackToSuit: () => void;
}

export const GuessDialog: React.FC<GuessDialogProps> = ({
  showSuitDialog,
  showNumberDialog,
  selectedSuit,
  position,
  onSuitSelect,
  onNumberSelect,
  onCancel,
  onBackToSuit
}) => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const numbers: CardNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  const suitSymbols: { [key in Suit]: string } = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  };

  const getDisplayNumber = (num: CardNumber): string => {
    switch (num) {
      case 1: return 'A';
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      default: return num.toString();
    }
  };

  if (!showSuitDialog && !showNumberDialog) {
    return null;
  }

  return (
    <Draggable
      defaultPosition={position}
      handle=".dialog-header"
    >
      <div className="guess-dialog">
        <div className="dialog-header">
          <h3>{showSuitDialog ? 'スートを選択' : '数字を選択'}</h3>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        
        {showSuitDialog && (
          <div className="suit-selection">
            {suits.map(suit => (
              <button
                key={suit}
                className={`suit-button ${suit}`}
                onClick={() => onSuitSelect(suit)}
              >
                {suitSymbols[suit]}
              </button>
            ))}
          </div>
        )}

        {showNumberDialog && (
          <div className="number-selection">
            <div className="selected-suit">
              <span className={`suit-symbol ${selectedSuit}`}>
                {selectedSuit && suitSymbols[selectedSuit]}
              </span>
              <button className="back-button" onClick={onBackToSuit}>
                ←
              </button>
            </div>
            <div className="number-grid">
              {numbers.map(num => (
                <button
                  key={num}
                  className="number-button"
                  onClick={() => onNumberSelect(num)}
                >
                  {getDisplayNumber(num)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
}; 