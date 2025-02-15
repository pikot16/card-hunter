import { useState, useCallback } from 'react';
import { Card, Suit } from '../types/game';

interface DialogPosition {
  x: number;
  y: number;
}

interface SelectedCard {
  playerIndex: number;
  cardIndex: number;
  revealedCardIndex?: number;
  revealedPlayerIndex?: number;
}

export const useDialogState = () => {
  const [showSuitDialog, setShowSuitDialog] = useState(false);
  const [showNumberDialog, setShowNumberDialog] = useState(false);
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [dialogPosition, setDialogPosition] = useState<DialogPosition>({ x: 0, y: 0 });
  const [isSelectingOwnCard, setIsSelectingOwnCard] = useState(false);

  const handleSuitSelect = useCallback((suit: Suit) => {
    setSelectedSuit(suit);
    setShowSuitDialog(false);
    setShowNumberDialog(true);
  }, []);

  const handleCancelSelection = useCallback(() => {
    setSelectedCard(null);
    setShowSuitDialog(false);
    setShowNumberDialog(false);
    setSelectedSuit(null);
    setDialogPosition({ x: 0, y: 0 });
  }, []);

  const handleBackToSuit = useCallback(() => {
    setShowNumberDialog(false);
    setShowSuitDialog(true);
  }, []);

  return {
    showSuitDialog,
    setShowSuitDialog,
    showNumberDialog,
    setShowNumberDialog,
    selectedSuit,
    setSelectedSuit,
    selectedCard,
    setSelectedCard,
    dialogPosition,
    setDialogPosition,
    isSelectingOwnCard,
    setIsSelectingOwnCard,
    handleSuitSelect,
    handleCancelSelection,
    handleBackToSuit
  };
}; 