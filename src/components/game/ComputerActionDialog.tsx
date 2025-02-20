import React from 'react';
import { ComputerAction } from '../../types/models/computer';
import Draggable from 'react-draggable';

interface ComputerActionDialogProps {
  action: ComputerAction;
  position: { x: number; y: number };
  onClose: () => void;
  onContinue: () => void;
}

export const ComputerActionDialog: React.FC<ComputerActionDialogProps> = ({
  action,
  position,
  onClose,
  onContinue
}) => {
  const suitSymbols: { [key: string]: string } = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  };

  const getDisplayNumber = (num: number): string => {
    switch (num) {
      case 1: return 'A';
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      default: return num.toString();
    }
  };

  return (
    <Draggable
      defaultPosition={position}
      handle=".dialog-header"
    >
      <div className="computer-action-dialog">
        <div className="dialog-header">
          <h3>コンピューターの行動</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="action-content">
          <p className="action-description">
            <span className="player-name">{action.player}</span>は
            <span className="target-name">{action.targetPlayer}</span>の
            <span className="card-index">{action.cardIndex + 1}番目</span>
            のカードを選びました
          </p>

          <div className="guess-result">
            <p>予想：</p>
            <div className={`card-guess ${action.guessedCard.suit}`}>
              {suitSymbols[action.guessedCard.suit]}
              {getDisplayNumber(action.guessedCard.number)}
            </div>
            <div className={`result-icon ${action.isCorrect ? 'correct' : 'incorrect'}`}>
              {action.isCorrect ? '○' : '×'}
            </div>
          </div>

          {action.isCorrect && action.willContinue && (
            <button className="continue-button" onClick={onContinue}>
              続けて予想する
            </button>
          )}
        </div>
      </div>
    </Draggable>
  );
}; 