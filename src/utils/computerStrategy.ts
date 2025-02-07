import { Card, Player, GameState } from '../types/game';

// 各スートと数字の組み合わせの可能性を追跡
interface CardProbability {
  suit: Card['suit'];
  number: number;
  probability: number;
}

// 既に公開されているカードを収集
const getRevealedCards = (players: Player[]): Card[] => {
  return players.flatMap(player => 
    player.cards.filter(card => card.isRevealed)
  );
};

// 特定のスートと数字の組み合わせが既に公開されているかチェック
const isCardRevealed = (revealedCards: Card[], suit: Card['suit'], number: number): boolean => {
  return revealedCards.some(card => card.suit === suit && card.number === number);
};

// カードの位置に基づいて可能な数字の範囲を計算
const getPossibleNumberRange = (cardIndex: number, totalCards: number): { min: number; max: number } => {
  // カードは昇順で並んでいるため、位置に基づいて可能な数字の範囲を計算
  const segmentSize = 13 / totalCards;
  const minNumber = Math.max(1, Math.floor(cardIndex * segmentSize));
  const maxNumber = Math.min(13, Math.ceil((cardIndex + 1) * segmentSize));
  
  return { min: minNumber, max: maxNumber };
};

// 残っている可能性のあるカードとその確率を計算
const calculateCardProbabilities = (
  gameState: GameState,
  targetPlayer: Player,
  cardIndex: number
): CardProbability[] => {
  const revealedCards = getRevealedCards(gameState.players);
  const probabilities: CardProbability[] = [];
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  
  // カードの位置に基づいて可能な数字の範囲を取得
  const unrevealedCards = targetPlayer.cards.filter(card => !card.isRevealed);
  const { min, max } = getPossibleNumberRange(cardIndex, unrevealedCards.length);
  const possibleNumbers = Array.from(
    { length: max - min + 1 }, 
    (_, i) => min + i
  );

  // 前のカードの数字を取得（存在する場合）
  const previousCard = cardIndex > 0 ? targetPlayer.cards[cardIndex - 1] : null;
  const minAllowedNumber = previousCard ? previousCard.number : 1;

  // 次のカードの数字を取得（存在する場合）
  const nextCard = cardIndex < targetPlayer.cards.length - 1 ? targetPlayer.cards[cardIndex + 1] : null;
  const maxAllowedNumber = nextCard ? nextCard.number : 13;

  // 各スートと数字の組み合わせについて確率を計算
  suits.forEach(suit => {
    possibleNumbers.forEach(number => {
      // 数字が前後のカードの制約を満たしているか確認
      if (number < minAllowedNumber || number > maxAllowedNumber) {
        return;
      }

      // 既に公開されているカードは除外
      if (!isCardRevealed(revealedCards, suit, number)) {
        // 基本確率を設定
        let probability = 1.0;

        // 同じスートのカードが既に出ている場合、確率を調整
        const sameRevealedSuit = revealedCards.filter(card => card.suit === suit).length;
        probability *= (1 - (sameRevealedSuit / 13));

        // 同じ数字のカードが既に出ている場合、確率を調整
        const sameRevealedNumber = revealedCards.filter(card => card.number === number).length;
        probability *= (1 - (sameRevealedNumber / 4));

        // カードの位置に基づく確率の調整
        const positionProbability = 1 - Math.abs((number - (min + max) / 2) / (max - min + 1));
        probability *= positionProbability;

        probabilities.push({ suit, number, probability });
      }
    });
  });

  return probabilities;
};

// 最も確率の高いカードを選択
const selectBestGuess = (probabilities: CardProbability[]): { suit: Card['suit'], number: number } => {
  if (probabilities.length === 0) {
    throw new Error('No valid card probabilities available');
  }

  // 確率でソートして最も高いものを選択
  const sorted = [...probabilities].sort((a, b) => b.probability - a.probability);
  
  // 上位3つの中からランダムに選択（完全な決定論を避けるため）
  const topThree = sorted.slice(0, Math.min(3, sorted.length));
  const selected = topThree[Math.floor(Math.random() * topThree.length)];
  
  return {
    suit: selected.suit,
    number: selected.number
  };
};

// メインの予想ロジック
export const makeStrategicGuess = (
  gameState: GameState,
  targetPlayer: Player,
  cardIndex: number
): { suit: Card['suit'], number: number } | null => {
  // 表になっていないカードがない場合はnullを返す
  const unrevealedCards = targetPlayer.cards.filter(card => !card.isRevealed);
  if (unrevealedCards.length === 0) return null;

  try {
    // カードの確率を計算
    const probabilities = calculateCardProbabilities(gameState, targetPlayer, cardIndex);
    if (probabilities.length === 0) return null;

    // 最適な予想を選択
    return selectBestGuess(probabilities);
  } catch (error) {
    console.error('Error in makeStrategicGuess:', error);
    return null;
  }
};

// コンピュータープレイヤーが続けて予想するかどうかを決定する関数
export const decideToContinue = (player: Player, gameState: GameState): boolean => {
  // 性格タイプに基づく基本確率を設定
  let baseProbability = 0.5; // デフォルトは50%

  switch (player.personalityType) {
    case 'aggressive':
      baseProbability = 0.6; // 積極的なプレイヤーは60%の確率で続行（80%から調整）
      break;
    case 'cautious':
      baseProbability = 0.2; // 慎重なプレイヤーは20%の確率で続行
      break;
    case 'balanced':
      baseProbability = 0.4; // バランスの取れたプレイヤーは40%の確率で続行（50%から調整）
      break;
  }

  // 状況に応じて確率を調整
  const unrevealedCards = gameState.players
    .find(p => p.id !== player.id)?.cards
    .filter(card => !card.isRevealed).length || 0;

  // 残りカードが少ない場合は続行確率を上げる（調整）
  if (unrevealedCards <= 3) {
    baseProbability += 0.1; // 0.2から0.1に調整
  }

  // 自分の手札が多く残っている場合は慎重になる
  const ownUnrevealedCards = player.cards.filter(card => !card.isRevealed).length;
  if (ownUnrevealedCards <= 3) {
    baseProbability += 0.1; // 0.2から0.1に調整（リスクを取りやすさを抑制）
  } else {
    baseProbability -= 0.2; // 0.1から0.2に調整（より慎重に）
  }

  // 最終的な確率を0から1の間に収める
  const finalProbability = Math.max(0, Math.min(0.7, baseProbability)); // 最大確率を0.7に制限

  // 確率に基づいて決定
  return Math.random() < finalProbability;
}; 