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
  expert: 0.95       // 95%の精度に引き上げ
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
const getPossibleNumberRange = (
  cardIndex: number, 
  player: Player,
  allPlayers: Player[]
): { min: number; max: number } => {
  const cards = player.cards;
  let minNumber = 1;
  let maxNumber = 13;

  // 同じプレイヤーの公開カードから範囲を制限
  let lastRevealedNumber = 0;
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].isRevealed) {
      if (i < cardIndex) {
        // 対象より前の位置にある公開カードの数字以上でなければならない
        // 同じ数字の異なるスートは許容
        lastRevealedNumber = cards[i].number;
        minNumber = Math.max(minNumber, lastRevealedNumber);
      } else if (i > cardIndex) {
        // 対象より後の位置にある公開カードの数字以下でなければならない
        // 同じ数字の異なるスートは許容
        maxNumber = Math.min(maxNumber, cards[i].number);
      }
    }
  }

  // デバッグ用のログ
  console.log(`Card ${cardIndex + 1} range from revealed cards: ${minNumber} - ${maxNumber}`);
  console.log(`Last revealed number before index: ${lastRevealedNumber}`);

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

// 過去の予想を記録するためのメモリ
const guessHistory = new Map<string, Array<{
  cardIndex: number;
  suit: Card['suit'];
  number: number;
  isCorrect: boolean;
}>>();

// カードの連続性に基づく確率調整を行う関数を追加
const calculateSequentialProbability = (
  cardIndex: number,
  number: number,
  player: Player,
  revealedCards: Card[]
): number => {
  let probability = 1.0;

  // 前のカードの数字を推定
  const previousNumbers: number[] = [];
  for (let i = 0; i < cardIndex; i++) {
    const card = player.cards[i];
    if (card.isRevealed) {
      previousNumbers.push(card.number);
    }
  }

  // 同じ数字が連続する確率を低く設定
  if (previousNumbers.length > 0) {
    const lastKnownNumber = previousNumbers[previousNumbers.length - 1];
    if (number === lastKnownNumber) {
      probability *= 0.3; // 同じ数字が続く確率を30%に抑制
    }
  }

  // 未公開の前のカードがある場合の確率調整
  const unrevealedPreviousCards = cardIndex - previousNumbers.length;
  if (unrevealedPreviousCards > 0) {
    // 位置に応じた期待値からの確率計算
    const expectedMinNumber = Math.max(1, Math.floor((cardIndex - 1) * 13 / player.cards.length));
    if (number < expectedMinNumber) {
      probability *= 0.5; // 期待値より小さい数字の確率を50%に抑制
    }
  }

  return probability;
};

// カードの分配確率を考慮した確率調整を行う関数を追加
const calculateDistributionProbability = (
  number: number,
  suit: Card['suit'],
  cardIndex: number,
  player: Player,
  allPlayers: Player[]
): number => {
  let probability = 1.0;
  console.log(`\n=== 確率計算開始: ${cardIndex + 1}番目のカード, 数字${number}, スート${suit} ===`);

  // 同じ数字のカードの出現状況を確認
  const sameNumberCount = allPlayers.reduce((count, p) => 
    count + p.cards.filter(c => c.isRevealed && c.number === number).length,
    0
  );
  console.log(`同じ数字(${number})の出現回数: ${sameNumberCount}`);

  // 同じ数字が既に多く出ている場合は確率を下げる
  if (sameNumberCount > 0) {
    probability *= Math.pow(0.5, sameNumberCount);
    console.log(`同じ数字による確率調整: ${probability.toFixed(4)}`);
  }

  // カードの位置に基づく確率計算を厳密化
  const totalCards = player.cards.length; // 通常は13
  const position = cardIndex + 1; // 1-indexed
  console.log(`カード位置: ${position}番目`);

  // 理論的な位置に基づく確率計算
  const expectedPosition = ((number - 1) * totalCards / 13) + 1;
  const positionDiff = Math.abs(position - expectedPosition);
  console.log(`理想的な位置: ${expectedPosition.toFixed(1)}番目`);
  console.log(`位置の差: ${positionDiff.toFixed(1)}`);

  // 位置の差が大きいほど確率を大きく下げる
  let originalProbability = probability;
  if (positionDiff >= 5) {
    probability *= 0.01;
    console.log(`位置の差が5以上 → 確率を99%下げる: ${originalProbability.toFixed(4)} → ${probability.toFixed(4)}`);
  } else if (positionDiff >= 3) {
    probability *= 0.1;
    console.log(`位置の差が3-4 → 確率を90%下げる: ${originalProbability.toFixed(4)} → ${probability.toFixed(4)}`);
  } else if (positionDiff >= 2) {
    probability *= 0.3;
    console.log(`位置の差が2 → 確率を70%下げる: ${originalProbability.toFixed(4)} → ${probability.toFixed(4)}`);
  } else if (positionDiff >= 1) {
    probability *= 0.7;
    console.log(`位置の差が1 → 確率を30%下げる: ${originalProbability.toFixed(4)} → ${probability.toFixed(4)}`);
  }

  // 極端な位置の場合の追加ペナルティ
  originalProbability = probability;
  if ((number <= 3 && position >= totalCards - 2) || 
      (number >= 11 && position <= 2)) {
    probability *= 0.01;
    console.log(`極端な位置による追加ペナルティ: ${originalProbability.toFixed(4)} → ${probability.toFixed(4)}`);
  }

  console.log(`=== 最終確率: ${probability.toFixed(4)} ===\n`);
  return probability;
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
  const revealedCards = getRevealedCards(gameState.players);
  
  // 過去の予想履歴を取得
  const playerKey = `${targetPlayer.name}-${cardIndex}`;
  const cardHistory = guessHistory.get(playerKey) || [];
  
  // カードの位置に基づいて可能な数字の範囲を取得
  const { min, max } = getPossibleNumberRange(cardIndex, targetPlayer, gameState.players);
  
  // 範囲が無効な場合は空の配列を返す
  if (min > max) {
    return [];
  }

  const possibleNumbers = Array.from(
    { length: max - min + 1 }, 
    (_, i) => min + i
  );

  suits.forEach(suit => {
    possibleNumbers.forEach(number => {
      // 既に他の位置で使用されているカードはスキップ
      if (gameState.players.some(player =>
        player.cards.some(card =>
          card.isRevealed && card.suit === suit && card.number === number
        )
      )) {
        return;
      }

      // 過去に不正解だった予想はスキップ
      if (cardHistory.some(guess => 
        guess.suit === suit && 
        guess.number === number && 
        !guess.isCorrect
      )) {
        return;
      }

      // 不可能なカードの組み合わせをスキップ
      if (impossibleCards.some(card => card.suit === suit && card.number === number)) {
        return;
      }

      let probability = 1.0;

      // カードの連続性による確率調整
      probability *= calculateSequentialProbability(
        cardIndex,
        number,
        targetPlayer,
        revealedCards
      );

      // カードの分配確率による調整
      probability *= calculateDistributionProbability(
        number,
        suit,
        cardIndex,
        targetPlayer,
        gameState.players
      );

      // スキルレベルによる調整
      probability *= SKILL_LEVEL_FACTORS[skillLevel || 'intermediate'];

      // 確率が0より大きい場合のみ追加
      if (probability > 0) {
        probabilities.push({ suit, number, probability });
      }
    });
  });

  return probabilities;
};

// 予想結果を記録する関数
const recordGuess = (
  targetPlayer: Player,
  cardIndex: number,
  suit: Card['suit'],
  number: number,
  isCorrect: boolean
) => {
  const playerKey = `${targetPlayer.name}-${cardIndex}`;
  const history = guessHistory.get(playerKey) || [];
  history.push({ cardIndex, suit, number, isCorrect });
  guessHistory.set(playerKey, history);
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
  
  // 上級レベルの場合は、確率が極端に低い選択肢を除外
  if (skillLevel === 'expert') {
    const topProbability = sorted[0].probability;
    // 最高確率の1%未満の確率の選択肢は除外
    const viableChoices = sorted.filter(card => 
      card.probability >= topProbability * 0.01
    );
    
    // 残った選択肢の中から、最も確率の高いものを選択
    return {
      suit: viableChoices[0].suit,
      number: viableChoices[0].number
    };
  }

  // その他のレベルは従来の選択方法を使用（変更なし）
  const selectionRatio = {
    beginner: 0.5,
    intermediate: 0.2,
    expert: 0.1
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

// メインの予想ロジックを修正
export const makeStrategicGuess = (
  gameState: GameState,
  targetPlayer: Player,
  cardIndex: number
): { suit: Card['suit'], number: number } | null => {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  console.log(`\n=== コンピュータの予想開始 ===`);
  console.log(`予想プレイヤー: ${currentPlayer.name} (${currentPlayer.skillLevel})`);
  console.log(`対象プレイヤー: ${targetPlayer.name}`);
  console.log(`対象カード: ${cardIndex + 1}番目`);
  
  try {
    const probabilities = calculateCardProbabilities(
      gameState,
      targetPlayer,
      cardIndex,
      currentPlayer.skillLevel
    );
    
    if (probabilities.length === 0) {
      console.log('有効な予想候補がありません');
      return null;
    }

    // 確率でソートして上位5つを表示
    const topProbabilities = [...probabilities]
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);
    
    console.log('\n=== 上位5つの予想候補 ===');
    topProbabilities.forEach((p, i) => {
      console.log(`${i + 1}. ${p.suit} ${p.number}: ${(p.probability * 100).toFixed(2)}%`);
    });

    const guess = selectBestGuess(probabilities, currentPlayer.skillLevel);
    console.log(`\n最終予想: ${guess.suit} ${guess.number}\n`);
    
    // 予想を記録
    recordGuess(
      targetPlayer,
      cardIndex,
      guess.suit,
      guess.number,
      targetPlayer.cards[cardIndex].suit === guess.suit && 
      targetPlayer.cards[cardIndex].number === guess.number
    );

    return guess;
  } catch (error) {
    console.error('Error in makeStrategicGuess:', error);
    return null;
  }
};

// コンピュータープレイヤーが続けて予想するかどうかを決定する関数
export const decideToContinue = (player: Player, gameState: GameState): boolean => {
  // 性格タイプに基づく基本確率を設定
  let baseProbability = 0.5; // デフォルトは50%

  // 性格タイプに基づいて確率を調整
  switch (player.personalityType) {
    case 'aggressive':
      baseProbability = 0.8; // 80%の確率で続行
      break;
    case 'cautious':
      baseProbability = 0.2; // 20%の確率で続行
      break;
    case 'balanced':
      baseProbability = 0.5; // 50%の確率で続行
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