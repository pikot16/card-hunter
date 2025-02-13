import { GameState, Player, Card } from '../types/game';
import { shuffleCards } from './cardUtils';
import { makeStrategicGuess, decideToContinue } from './computerStrategy';

// テスト用のゲーム状態を初期化する関数
const initializeTestGame = (): GameState => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const numbers = Array.from({ length: 13 }, (_, i) => i + 1);
  const allCards = suits.flatMap(suit =>
    numbers.map(number => ({ suit, number, isRevealed: false }))
  );

  const shuffledCards = shuffleCards([...allCards]);
  const cardsPerPlayer = 13;

  const players: Player[] = [
    {
      id: 0,
      name: 'AI 1 (初級)',
      isComputer: true,
      personalityType: 'aggressive',
      skillLevel: 'beginner',
      cards: shuffledCards.slice(0, cardsPerPlayer).sort((a, b) => a.number - b.number)
    },
    {
      id: 1,
      name: 'AI 2 (中級)',
      isComputer: true,
      personalityType: 'cautious',
      skillLevel: 'intermediate',
      cards: shuffledCards.slice(cardsPerPlayer, cardsPerPlayer * 2).sort((a, b) => a.number - b.number)
    },
    {
      id: 2,
      name: 'AI 3 (上級)',
      isComputer: true,
      personalityType: 'balanced',
      skillLevel: 'expert',
      cards: shuffledCards.slice(cardsPerPlayer * 2, cardsPerPlayer * 3).sort((a, b) => a.number - b.number)
    },
    {
      id: 3,
      name: 'AI 4 (中級)',
      isComputer: true,
      personalityType: 'balanced',
      skillLevel: 'intermediate',
      cards: shuffledCards.slice(cardsPerPlayer * 3, cardsPerPlayer * 4).sort((a, b) => a.number - b.number)
    }
  ];

  return {
    players,
    currentPlayerIndex: 0,
    gameStatus: 'playing',
    winner: null,
    logs: [],
    eliminationOrder: []
  };
};

// 次のアクティブなプレイヤーのインデックスを取得
const getNextActivePlayerIndex = (players: Player[], currentIndex: number): number => {
  let nextIndex = currentIndex;
  let checkedCount = 0;

  while (checkedCount < players.length) {
    nextIndex = (nextIndex + 1) % players.length;
    if (!players[nextIndex].cards.every(card => card.isRevealed)) {
      return nextIndex;
    }
    checkedCount++;
  }

  return -1; // アクティブなプレイヤーが見つからない場合
};

// 表になっていないカードのインデックスをランダムに取得
const getRandomUnrevealedCardIndex = (cards: Card[]): number => {
  const unrevealedIndices = cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !card.isRevealed)
    .map(({ index }) => index);
  
  if (unrevealedIndices.length === 0) return -1;
  return unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
};

// テスト実行状態を管理
let isTestRunning = false;

// テストを停止する関数
export const stopTest = () => {
  isTestRunning = false;
};

// ゲームが終了したかどうかをチェックする関数を修正
const isGameFinished = (players: Player[]): boolean => {
  // アクティブなプレイヤー（全カードが公開されていないプレイヤー）を取得
  const activePlayers = players.filter(player => 
    player.cards.some(card => !card.isRevealed)
  );

  // アクティブなプレイヤーが1人以下ならゲーム終了
  if (activePlayers.length <= 1) {
    return true;
  }
  return false;
};

// ゲーム状態を出力する関数を分離
const printGameState = (players: Player[], turnCount: number | null = null) => {
  if (turnCount !== null) {
    console.log(`\nターン ${turnCount}の状態:`);
  } else {
    console.log('\n現在のゲーム状態:');
  }
  players.forEach(player => {
    const unrevealedCount = player.cards.filter(card => !card.isRevealed).length;
    console.log(`${player.name}: 裏向きカード ${unrevealedCount}枚`);
  });
};

// 予想可能なプレイヤーとカードの組み合わせを取得
const getValidTargets = (gameState: GameState, currentPlayerIndex: number): Array<{playerIndex: number; cardIndex: number}> => {
  const validTargets: Array<{playerIndex: number; cardIndex: number}> = [];
  const { players } = gameState;

  // 次のプレイヤーを探す（脱落したプレイヤーはスキップ）
  let targetPlayerIndex = currentPlayerIndex;
  let checkedCount = 0;

  while (checkedCount < players.length) {
    targetPlayerIndex = (targetPlayerIndex + 1) % players.length;
    
    // 現在のプレイヤーに戻ってきた場合は終了
    if (targetPlayerIndex === currentPlayerIndex) {
      break;
    }

    // 脱落していないプレイヤーを見つけた場合
    if (!players[targetPlayerIndex].cards.every(card => card.isRevealed)) {
      // そのプレイヤーの未公開カードを収集
      players[targetPlayerIndex].cards.forEach((card, cardIndex) => {
        if (!card.isRevealed) {
          validTargets.push({ playerIndex: targetPlayerIndex, cardIndex });
        }
      });
      break; // 最初に見つかった有効なターゲットのみを返す
    }
    checkedCount++;
  }

  return validTargets;
};

// シミュレーションを実行する関数を修正
export const runAISimulation = async (numGames: number = 1): Promise<void> => {
  isTestRunning = true;
  let totalGuesses = 0;
  let correctGuesses = 0;
  const playerStats = new Map<string, { total: number; correct: number }>();

  console.log(`${numGames}ゲームのシミュレーションを開始します...`);

  for (let game = 0; game < numGames; game++) {
    if (!isTestRunning) {
      console.log('\nテストが中断されました');
      console.log(`${game}ゲームまで実行`);
      break;
    }

    console.log(`\nゲーム ${game + 1}/${numGames} を実行中...`);
    let gameState = initializeTestGame();
    
    // 各プレイヤーの統計を初期化
    gameState.players.forEach(player => {
      if (!playerStats.has(player.name)) {
        playerStats.set(player.name, { total: 0, correct: 0 });
      }
    });

    let turnCount = 0;
    let gameEnded = false;

    // 初期状態を出力
    console.log('\n初期状態:');
    printGameState(gameState.players);

    while (!gameEnded) {
      if (!isTestRunning) {
        console.log('\nテストが中断されました');
        return;
      }

      turnCount++;
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];

      // 現在のプレイヤーが脱落している場合、次のプレイヤーへ
      if (currentPlayer.cards.every(card => card.isRevealed)) {
        const nextIndex = getNextActivePlayerIndex(gameState.players, gameState.currentPlayerIndex);
        if (nextIndex === -1) {
          console.log('\nアクティブなプレイヤーが見つかりません。ゲームを終了します。');
          gameEnded = true;
          break;
        }
        gameState.currentPlayerIndex = nextIndex;
        continue;
      }

      // 次のターゲットプレイヤーを取得
      let targetPlayerIndex = gameState.currentPlayerIndex;
      let checkedCount = 0;
      
      while (checkedCount < gameState.players.length) {
        targetPlayerIndex = (targetPlayerIndex + 1) % gameState.players.length;
        if (!gameState.players[targetPlayerIndex].cards.every(card => card.isRevealed)) {
          break;
        }
        checkedCount++;
        if (checkedCount === gameState.players.length) {
          console.log('\n有効なターゲットが見つかりません。ゲームを終了します。');
          gameEnded = true;
          break;
        }
      }

      if (gameEnded) break;

      // ターゲットプレイヤーの未公開カードからランダムに選択
      const targetPlayer = gameState.players[targetPlayerIndex];
      const unrevealedCards = targetPlayer.cards
        .map((card, index) => ({ card, index }))
        .filter(item => !item.card.isRevealed);
      
      if (unrevealedCards.length === 0) {
        console.log('\n予想対象のカードが見つかりません。ゲームを終了します。');
        gameEnded = true;
        break;
      }

      const randomCard = unrevealedCards[Math.floor(Math.random() * unrevealedCards.length)];
      const cardIndex = randomCard.index;

      // 予想を生成
      const guess = makeStrategicGuess(gameState, targetPlayer, cardIndex);
      if (!guess) {
        console.log('\n予想生成に失敗。次のプレイヤーへ移動します。');
        gameState.currentPlayerIndex = getNextActivePlayerIndex(gameState.players, gameState.currentPlayerIndex);
        continue;
      }

      // 予想結果の処理
      const targetCard = targetPlayer.cards[cardIndex];
      const isCorrect = targetCard.suit === guess.suit && targetCard.number === guess.number;

      // ターンの結果をログ出力
      console.log(`\nターン ${turnCount}:`);
      console.log(`  ${currentPlayer.name} が ${targetPlayer.name} の ${cardIndex + 1}番目のカードを予想`);
      console.log(`  予想: ${guess.suit} ${guess.number} (${isCorrect ? '正解' : '不正解'})`);

      // 統計の更新
      totalGuesses++;
      if (isCorrect) correctGuesses++;
      
      const playerStat = playerStats.get(currentPlayer.name)!;
      playerStat.total++;
      if (isCorrect) playerStat.correct++;
      playerStats.set(currentPlayer.name, playerStat);

      // ゲーム状態の更新
      if (isCorrect) {
        // 正解の場合
        targetPlayer.cards[cardIndex].isRevealed = true;
        
        // ターン終了後の状態を出力
        printGameState(gameState.players, turnCount);

        // 続けて予想するかどうかを決定
        const shouldContinue = decideToContinue(currentPlayer, gameState);
        
        if (!shouldContinue || targetPlayer.cards.every(card => card.isRevealed)) {
          // 次のプレイヤーへ
          const nextIndex = getNextActivePlayerIndex(gameState.players, gameState.currentPlayerIndex);
          if (nextIndex === -1) {
            console.log('\n次のアクティブなプレイヤーが見つかりません。ゲームを終了します。');
            gameEnded = true;
            break;
          }
          gameState.currentPlayerIndex = nextIndex;
        }
      } else {
        // 不正解の場合
        const ownUnrevealedCards = currentPlayer.cards.filter(card => !card.isRevealed);
        if (ownUnrevealedCards.length > 0) {
          const randomIndex = Math.floor(Math.random() * ownUnrevealedCards.length);
          const cardToReveal = ownUnrevealedCards[randomIndex];
          const cardIndexInHand = currentPlayer.cards.indexOf(cardToReveal);
          currentPlayer.cards[cardIndexInHand].isRevealed = true;
        }

        // ターン終了後の状態を出力
        printGameState(gameState.players, turnCount);
        
        // 必ず次のプレイヤーへ
        const nextIndex = getNextActivePlayerIndex(gameState.players, gameState.currentPlayerIndex);
        if (nextIndex === -1) {
          console.log('\n次のアクティブなプレイヤーが見つかりません。ゲームを終了します。');
          gameEnded = true;
          break;
        }
        gameState.currentPlayerIndex = nextIndex;
      }

      // ゲーム終了判定
      if (isGameFinished(gameState.players)) {
        const winner = gameState.players.find(player => 
          player.cards.some(card => !card.isRevealed)
        );
        if (winner) {
          console.log(`\nゲーム終了 - ${winner.name}の勝利！`);
        } else {
          console.log('\nゲーム終了 - 引き分け');
        }
        gameEnded = true;
      }
    }

    console.log(`\nゲーム ${game + 1} 終了 - 合計${turnCount}ターン`);
  }

  if (isTestRunning) {
    // 結果を出力
    console.log(`=== AI シミュレーション結果 (${numGames}ゲーム) ===`);
    console.log(`全体の正答率: ${((correctGuesses / totalGuesses) * 100).toFixed(2)}%`);
    console.log(`総予想回数: ${totalGuesses}`);
    console.log(`正解回数: ${correctGuesses}`);
    console.log('\nプレイヤー別の統計:');
    playerStats.forEach((stats, playerName) => {
      const accuracy = ((stats.correct / stats.total) * 100).toFixed(2);
      console.log(`${playerName}:`);
      console.log(`  正答率: ${accuracy}%`);
      console.log(`  予想回数: ${stats.total}`);
      console.log(`  正解回数: ${stats.correct}`);
    });
  }
  
  isTestRunning = false;
}; 