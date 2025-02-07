import { Card, Player, GameState } from '../types/game';

// 各スートと数字の組み合わせの可能性を追跡
interface CardProbability {
  suit: Card['suit'];
  number: number;
  probability: number;
}

// スキルレベルに基づく確率調整係数
const SKILL_LEVEL_FACTORS = {
  beginner: 0.3,    // 30%の精度
  intermediate: 0.6, // 60%の精度
  expert: 0.9,      // 90%の精度
};

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

// 既に公開されているカードと過去の予想結果から、ありえないカードを収集
const getImpossibleCards = (gameState: GameState, targetPlayer: Player): Array<{ suit: Card['suit']; number: number }> => {
  const impossibleCards: Array<{ suit: Card['suit']; number: number }> = [];
  
  // 既に公開されているカードを追加
  const revealedCards = getRevealedCards(gameState.players);
  revealedCards.forEach(card => {
    impossibleCards.push({ suit: card.suit, number: card.number });
  });

  // 過去の不正解の予想から情報を収集
  gameState.logs
    .filter(log => log.targetPlayer === targetPlayer.name && !log.isCorrect)
    .forEach(log => {
      impossibleCards.push({ 
        suit: log.guessedSuit as Card['suit'], 
        number: log.guessedNumber 
      });
    });

  return impossibleCards;
};

// カードの確率を計算する際に過去の予想結果を考慮
const calculateCardProbabilities = (
  gameState: GameState,
  targetPlayer: Player,
  cardIndex: number,
  skillLevel: Player['skillLevel'] = 'intermediate'
): CardProbability[] => {
  const impossibleCards = getImpossibleCards(gameState, targetPlayer);
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
  const minAllowedNumber = previousCard?.isRevealed ? previousCard.number : 1;

  // 次のカードの数字を取得（存在する場合）
  const nextCard = cardIndex < targetPlayer.cards.length - 1 ? targetPlayer.cards[cardIndex + 1] : null;
  const maxAllowedNumber = nextCard?.isRevealed ? nextCard.number : 13;

  // 過去の正解の予想から傾向を分析
  const correctGuesses = gameState.logs.filter(log => 
    log.targetPlayer === targetPlayer.name && log.isCorrect
  );
  const suitTendency = new Map<Card['suit'], number>();
  suits.forEach(suit => {
    const suitCorrectCount = correctGuesses.filter(log => log.guessedSuit === suit).length;
    suitTendency.set(suit, suitCorrectCount);
  });

  // 各スートと数字の組み合わせについて確率を計算
  suits.forEach(suit => {
    possibleNumbers.forEach(number => {
      // 数字が前後のカードの制約を満たしているか確認
      if (number < minAllowedNumber || number > maxAllowedNumber) {
        return;
      }

      // 不可能なカードの組み合わせをスキップ
      if (impossibleCards.some(card => card.suit === suit && card.number === number)) {
        return;
      }

      // 基本確率を設定
      let probability = 1.0;

      // カードの位置に基づく確率の調整（修正）
      const position = cardIndex + 1;  // 1-based index
      const expectedNumber = Math.floor((position * 13) / 14);  // より正確な期待値
      const positionProbability = 1 - (Math.abs(number - expectedNumber) / 13);
      probability *= positionProbability;

      // 同じスートと数字の調整を加算的に行う
      const sameRevealedSuit = impossibleCards.filter(card => card.suit === suit).length;
      const sameRevealedNumber = impossibleCards.filter(card => card.number === number).length;
      probability *= (1 - (sameRevealedSuit / 26) - (sameRevealedNumber / 8));

      // 前後のカードによる制約を強化
      if (previousCard?.isRevealed && nextCard?.isRevealed) {
        const isInRange = number > previousCard.number && number < nextCard.number;
        probability *= isInRange ? 2.0 : 0.1;  // より強い制約
      }

      // 過去の正解パターンに基づく調整
      const suitSuccessRate = (suitTendency.get(suit) || 0) / Math.max(1, correctGuesses.length);
      probability *= (1 + suitSuccessRate);

      // スキルレベルは最後に適用
      probability *= SKILL_LEVEL_FACTORS[skillLevel || 'intermediate'];

      // 確率が0より大きい場合のみ追加
      if (probability > 0) {
        probabilities.push({ suit, number, probability });
      }
    });
  });

  return probabilities;
};

// 最も確率の高いカードを選択（スキルレベルに応じて選択方法を変える）
const selectBestGuess = (
  probabilities: CardProbability[],
  skillLevel: Player['skillLevel'] = 'intermediate'
): { suit: Card['suit'], number: number } => {
  if (probabilities.length === 0) {
    throw new Error('No valid card probabilities available');
  }

  // 確率でソート
  const sorted = [...probabilities].sort((a, b) => b.probability - a.probability);
  
  // スキルレベルに応じた選択範囲をより厳密に
  const selectionRatio = {
    beginner: 0.5,     // 上位50%
    intermediate: 0.3,  // 上位30%
    expert: 0.1        // 上位10%
  }[skillLevel || 'intermediate'];

  const poolSize = Math.max(1, Math.ceil(sorted.length * selectionRatio));
  const selectionPool = sorted.slice(0, poolSize);

  // 確率に基づいた重み付き選択を実装
  const totalWeight = selectionPool.reduce((sum, card) => sum + card.probability, 0);
  let random = Math.random() * totalWeight;
  
  for (const card of selectionPool) {
    random -= card.probability;
    if (random <= 0) {
      return {
        suit: card.suit,
        number: card.number
      };
    }
  }

  return {
    suit: selectionPool[0].suit,
    number: selectionPool[0].number
  };
};

// メインの予想ロジック
export const makeStrategicGuess = (
  gameState: GameState,
  targetPlayer: Player,
  cardIndex: number
): { suit: Card['suit'], number: number } | null => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // 表になっていないカードがない場合はnullを返す
  const unrevealedCards = targetPlayer.cards.filter(card => !card.isRevealed);
  if (unrevealedCards.length === 0) return null;

  try {
    // カードの確率を計算（スキルレベルを考慮）
    const probabilities = calculateCardProbabilities(
      gameState,
      targetPlayer,
      cardIndex,
      currentPlayer.skillLevel
    );
    
    if (probabilities.length === 0) return null;

    // 最適な予想を選択（スキルレベルを考慮）
    return selectBestGuess(probabilities, currentPlayer.skillLevel);
  } catch (error) {
    console.error('Error in makeStrategicGuess:', error);
    return null;
  }
};

// コンピュータープレイヤーが続けて予想するかどうかを決定する関数
export const decideToContinue = (player: Player, gameState: GameState): boolean => {
  // スキルレベルに基づく基本確率を設定
  let baseProbability = SKILL_LEVEL_FACTORS[player.skillLevel || 'intermediate'];

  // 性格タイプに基づいて確率を調整
  switch (player.personalityType) {
    case 'aggressive':
      baseProbability *= 1.2; // より積極的に
      break;
    case 'cautious':
      baseProbability *= 0.8; // より慎重に
      break;
    case 'balanced':
      // 変更なし
      break;
  }

  // 状況に応じて確率を調整
  const unrevealedCards = gameState.players
    .find(p => p.id !== player.id)?.cards
    .filter(card => !card.isRevealed).length || 0;

  // 残りカードが少ない場合は続行確率を上げる
  if (unrevealedCards <= 3) {
    baseProbability *= 1.2;
  }

  // 自分の手札が多く残っている場合は慎重になる
  const ownUnrevealedCards = player.cards.filter(card => !card.isRevealed).length;
  if (ownUnrevealedCards <= 3) {
    baseProbability *= 1.2;
  } else {
    baseProbability *= 0.8;
  }

  // 最終的な確率を0から1の間に収める
  const finalProbability = Math.max(0, Math.min(0.9, baseProbability));

  // 確率に基づいて決定
  return Math.random() < finalProbability;
}; 