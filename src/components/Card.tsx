import React from 'react';
import { Card as CardType } from '../types/game';
import '../styles/Card.css';

interface CardProps {
  card: CardType;
  isHidden: boolean;
  isSelected?: boolean;
  onClick: () => void;
  index?: number;
}

const Card: React.FC<CardProps> = ({ card, isHidden, isSelected = false, onClick, index }) => {
  const getCardImage = () => {
    if (isHidden && !card.isRevealed) {
      return '/images/cards/back.png';
    }

    const numberMap: { [key: number]: string } = {
      1: 'ace',
      11: 'jack',
      12: 'queen',
      13: 'king'
    };

    const suitMap: { [key: string]: string } = {
      'hearts': 'hearts',
      'diamonds': 'diamonds',
      'clubs': 'clubs',
      'spades': 'spades'
    };

    const numberStr = numberMap[card.number] || card.number.toString();
    const suitStr = suitMap[card.suit];
    
    return `/images/cards/${numberStr}_of_${suitStr}.png`;
  };

  const getDisplayNumber = (num: number) => {
    switch (num) {
      case 1: return 'A';
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      default: return num.toString();
    }
  };

  return (
    <div className="card-container">
      <div
        className={`playing-card ${card.isRevealed ? 'revealed' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
      >
        <img 
          src={getCardImage()} 
          alt={`${card.suit} ${card.number}`}
          className="card-image"
        />
      </div>
      <div className="card-index">{(index !== undefined) ? index + 1 : ''}</div>
    </div>
  );
};

export default Card; 