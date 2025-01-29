import React from 'react';
import { Card as CardType } from '../types/game';
import '../styles/Card.css';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isHidden?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ card, isSelected, isHidden, onClick }) => {
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

  return (
    <div 
      className={`playing-card ${isSelected ? 'selected' : ''} ${card.isRevealed ? 'revealed' : ''}`}
      onClick={onClick}
    >
      <img 
        src={getCardImage()} 
        alt={`${card.suit} ${card.number}`}
        className="card-image"
      />
    </div>
  );
};

export default Card; 