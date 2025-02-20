import React, { useState, useEffect } from 'react'
import Draggable from 'react-draggable'
import './App.css'
import { GameState, Player, Card as CardType, GameLog, CardNumber } from './types/game'
import { shuffleCards, getDisplayNumber, computerGuess } from './utils/cardUtils'
import { playCorrectSound, playIncorrectSound } from './utils/soundUtils'
import Card from './components/Card'
import { decideToContinue, selectCardPosition } from './utils/computerStrategy'
import { runTest } from './utils/runAITest'
import { stopTest } from './utils/aiTest'

function App() {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    gameStatus: 'waiting',
    winner: null,
    logs: [],
    eliminationOrder: []
  });

  // コンピューターの初期スキルレベルを設定
  const defaultComputerSkills: { [key: string]: Player['skillLevel'] } = {
    'Computer 1': 'beginner',
    'Computer 2': 'intermediate',
    'Computer 3': 'expert'
  };

  const [playerName, setPlayerName] = useState<string>('プレイヤー1');
  const [selectedCard, setSelectedCard] = useState<{playerIndex: number, cardIndex: number, revealedCardIndex?: number, revealedPlayerIndex?: number} | null>(null);
  const [showSuitDialog, setShowSuitDialog] = useState(false);
  const [showNumberDialog, setShowNumberDialog] = useState(false);
  const [selectedSuit, setSelectedSuit] = useState<CardType['suit'] | null>(null);
  const [isSelectingOwnCard, setIsSelectingOwnCard] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [showComputerActionDialog, setShowComputerActionDialog] = useState(false);
  const [computerAction, setComputerAction] = useState<{
    player: string;
    targetPlayer: string;
    cardIndex: number;
    guessedCard: { suit: string; number: number };
    isCorrect: boolean;
    updatedPlayers: Player[];
    nextPlayerIndex: number;
    willContinue: boolean;
  } | null>(null);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [correctGuessPlayers, setCorrectGuessPlayers] = useState<Player[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [dialogRef, setDialogRef] = useState<HTMLDivElement | null>(null);

  // スートの表示用マッピングを追加
  const suitSymbols: { [key: string]: string } = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  };

  // カードの表示用関数を追加
  const getDisplayCard = (suit: string, number: number) => {
    const displayNum = getDisplayNumber(number);
    return (
      <span className={`card-symbol ${suit}`}>
        {suitSymbols[suit]}{displayNum}
      </span>
    );
  };

  const getNextPlayerIndex = (currentIndex: number): number => {
    console.log('=== DEBUG: Next Player Calculation ===');
    console.log('Current Index:', currentIndex);
    console.log('Current Player:', gameState.players[currentIndex]?.name);
    
    let nextIndex = (currentIndex + 1) % gameState.players.length;
    console.log('Initial Next Index:', nextIndex);
    console.log('Initial Next Player:', gameState.players[nextIndex]?.name);
    
    // 全てのカードが表になっているプレイヤーをスキップ
    while (gameState.players[nextIndex]?.cards.every(card => card.isRevealed)) {
        console.log(`Player ${gameState.players[nextIndex]?.name} is skipped (all cards revealed)`);
        nextIndex = (nextIndex + 1) % gameState.players.length;
        console.log('New Next Index:', nextIndex);
        console.log('New Next Player:', gameState.players[nextIndex]?.name);
        
        // 一周してもプレイ可能なプレイヤーが見つからない場合は現在のインデックスを返す
        if (nextIndex === currentIndex) {
            console.log('Completed full circle, returning current index');
            return currentIndex;
        }
    }
    
    console.log('Final Next Player:', gameState.players[nextIndex]?.name);
    console.log('=== END DEBUG ===');
    return nextIndex;
  };

  const getNextTargetPlayerIndex = (currentIndex: number): number => {
    console.log('=== DEBUG: Next Target Player Calculation ===');
    console.log('Current Index:', currentIndex);
    
    let nextIndex = (currentIndex + 1) % gameState.players.length;
    let startIndex = nextIndex;
    
    // 全てのカードが表になっているプレイヤーをスキップ
    while (gameState.players[nextIndex]?.cards.every(card => card.isRevealed)) {
        console.log(`Target Player ${gameState.players[nextIndex]?.name} is skipped (all cards revealed)`);
        nextIndex = (nextIndex + 1) % gameState.players.length;
        
        // 一周してもプレイ可能なプレイヤーが見つからない場合は-1を返す（ゲーム終了）
        if (nextIndex === startIndex) {
            console.log('No valid target players found, game should end');
            return -1;
        }
    }
    
    console.log('Final Target Player:', gameState.players[nextIndex]?.name);
    console.log('=== END DEBUG ===');
    return nextIndex;
  };

  const handleCardSelect = (playerIndex: number, cardIndex: number) => {
    // ダイアログ表示中は新しいカードの選択を無効化
    if (showSuitDialog || showNumberDialog || showContinueDialog) {
      return;
    }

    // 自分のカードを選択するモード中の場合
    if (isSelectingOwnCard) {
      // 自分のカードのみ選択可能
      if (playerIndex === gameState.currentPlayerIndex) {
        const card = gameState.players[playerIndex].cards[cardIndex];
        if (!card.isRevealed) {
          handleOwnCardSelect(cardIndex);
          setIsSelectingOwnCard(false);
        }
      }
      return;
    }

    // 通常の予想モード（自分のカードを選択するモードでない場合のみ）
    if (gameState.currentPlayerIndex === 0 && 
        playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex) &&
        !gameState.players[playerIndex].cards[cardIndex].isRevealed) {
      setSelectedCard({ playerIndex, cardIndex });
      setShowSuitDialog(true);
    }
  };

  const handleSuitSelect = (suit: CardType['suit']) => {
    setSelectedSuit(suit);
    setShowSuitDialog(false);
    setShowNumberDialog(true);
    // 位置は維持したままにする
  };

  const handleCancelSelection = () => {
    setSelectedCard(null);
    setShowSuitDialog(false);
    setShowNumberDialog(false);
    setSelectedSuit(null);
    setDialogPosition({ x: 0, y: 0 });  // 位置をリセット
  };

  const handleBackToSuit = () => {
    setShowNumberDialog(false);
    setShowSuitDialog(true);
    // 位置は維持したままにする
  };

  // ゲームをリセットする関数を追加
  const resetGame = () => {
    setGameState({
      players: initializePlayers(playerName),  // プレイヤー名を渡す
      currentPlayerIndex: 0,
      gameStatus: 'waiting',
      winner: null,
      logs: [],
      eliminationOrder: []
    });
    setPlayerName('プレイヤー1');
    setSelectedCard(null);
    setShowSuitDialog(false);
    setShowNumberDialog(false);
    setSelectedSuit(null);
    setIsSelectingOwnCard(false);
    setDialogPosition({ x: 0, y: 0 });
    setShowComputerActionDialog(false);
    setComputerAction(null);
  };

  // コンピューターの設定を管理するための状態を追加
  const [computerSettings, setComputerSettings] = useState<{
    [key: number]: {
      skillLevel: Player['skillLevel'];
      personalityType: Player['personalityType'];
    }
  }>({
    1: {
      skillLevel: defaultComputerSkills['Computer 1'],
      personalityType: 'aggressive'
    },
    2: {
      skillLevel: defaultComputerSkills['Computer 2'],
      personalityType: 'balanced'
    },
    3: {
      skillLevel: defaultComputerSkills['Computer 3'],
      personalityType: 'cautious'
    }
  });

  // コンピューターの強さを変更する関数
  const handleComputerSkillChange = (computerId: number, skill: Player['skillLevel']) => {
    setComputerSettings(prev => ({
      ...prev,
      [computerId]: {
        ...prev[computerId],
        skillLevel: skill
      }
    }));
  };

  // コンピューターの性格を変更する関数
  const handleComputerPersonalityChange = (computerId: number, personality: Player['personalityType']) => {
    setComputerSettings(prev => ({
      ...prev,
      [computerId]: {
        ...prev[computerId],
        personalityType: personality
      }
    }));
  };

  // プレイヤーを初期化する関数を修正
  const initializePlayers = (playerName: string) => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const numbers = Array.from({ length: 13 }, (_, i) => (i + 1) as CardNumber);
    const allCards = suits.flatMap(suit =>
      numbers.map(number => ({ suit, number, isRevealed: false }))
    );

    const shuffledCards = shuffleCards(allCards);
    const cardsPerPlayer = 13;

    const players: Player[] = [
      {
        id: 0,
        name: playerName,
        isComputer: false,
        cards: shuffledCards.slice(0, cardsPerPlayer).sort((a, b) => a.number - b.number)
      },
      {
        id: 1,
        name: 'Computer 1',
        isComputer: true,
        personalityType: computerSettings[1].personalityType,
        skillLevel: computerSettings[1].skillLevel,
        cards: shuffledCards.slice(cardsPerPlayer, cardsPerPlayer * 2).sort((a, b) => a.number - b.number)
      },
      {
        id: 2,
        name: 'Computer 2',
        isComputer: true,
        personalityType: computerSettings[2].personalityType,
        skillLevel: computerSettings[2].skillLevel,
        cards: shuffledCards.slice(cardsPerPlayer * 2, cardsPerPlayer * 3).sort((a, b) => a.number - b.number)
      },
      {
        id: 3,
        name: 'Computer 3',
        isComputer: true,
        personalityType: computerSettings[3].personalityType,
        skillLevel: computerSettings[3].skillLevel,
        cards: shuffledCards.slice(cardsPerPlayer * 3, cardsPerPlayer * 4).sort((a, b) => a.number - b.number)
      }
    ];

    // ======================================================================
    // テスト用の一時的な変更: プレイヤーごとに異なる範囲のカードを表向きにする
    // プレイヤー1とComputer1: 1-12枚目が表
    // Computer2とComputer3: 2-13枚目が表
    // この部分は動作確認後に削除してください
    // ======================================================================
    players.forEach((player, playerIndex) => {
      player.cards.forEach((card, cardIndex) => {
        if (playerIndex <= 1) {  // プレイヤー1とComputer1
          if (cardIndex < 12) {  // 1-12枚目を表向きに
            card.isRevealed = true;
          }
        } else {  // Computer2とComputer3
          if (cardIndex > 0) {  // 2-13枚目を表向きに
            card.isRevealed = true;
          }
        }
      });
    });
    // ======================================================================

    // 各プレイヤーのカードを昇順にソート
    players.forEach(player => {
      player.cards.sort((a, b) => a.number - b.number);
    });

    return players;
  };

  // 新しい状態チェック関数を追加
  const checkGameState = (updatedPlayers: Player[], currentIndex: number): {
    eliminationOrder: number[];
    winner: Player | null;
    gameStatus: 'waiting' | 'playing' | 'finished';
    nextPlayerIndex: number;
  } => {
    console.log('=== DEBUG: Game State Check ===');
    console.log('Current Index:', currentIndex);
    console.log('Elimination Order:', gameState.eliminationOrder);

    // 1. 脱落プレイヤーの確認と更新
    const newlyEliminatedPlayers = updatedPlayers.filter(player => 
        player.cards.every(card => card.isRevealed) && 
        !gameState.eliminationOrder.includes(player.id)
    );

    let updatedEliminationOrder = [...gameState.eliminationOrder];
    
    if (newlyEliminatedPlayers.length > 0) {
        console.log('Newly Eliminated Players:', newlyEliminatedPlayers.map(p => p.name));
        newlyEliminatedPlayers.forEach(player => {
            if (!updatedEliminationOrder.includes(player.id)) {
                updatedEliminationOrder.push(player.id);
            }
        });
    }

    // 2. ゲーム終了判定
    const playersWithUnrevealedCards = updatedPlayers.filter(player =>
        player.cards.some(card => !card.isRevealed)
    );

    let winner: Player | null = null;
    let gameStatus: 'waiting' | 'playing' | 'finished' = 'playing';
    
    if (playersWithUnrevealedCards.length === 1) {
        winner = playersWithUnrevealedCards[0];
        gameStatus = 'finished';
        
        // 残りのプレイヤーを脱落順に追加
        const remainingPlayers = updatedPlayers.filter(player => 
            winner && player.id !== winner.id && 
            !updatedEliminationOrder.includes(player.id)
        );
        
        remainingPlayers.forEach(player => {
            if (!updatedEliminationOrder.includes(player.id)) {
                updatedEliminationOrder.push(player.id);
            }
        });
    }

    console.log('Updated Elimination Order:', updatedEliminationOrder);
    console.log('Game Status:', gameStatus);
    if (winner) console.log('Winner:', winner.name);
    console.log('=== END DEBUG ===');

    return {
        eliminationOrder: updatedEliminationOrder,
        winner,
        gameStatus,
        nextPlayerIndex: winner ? currentIndex : getNextPlayerIndex(currentIndex)
    };
  };

  // endTurn関数を更新
  const endTurn = (updatedPlayers: Player[]) => {
    const stateUpdate = checkGameState(updatedPlayers, gameState.currentPlayerIndex);
    
    setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        currentPlayerIndex: stateUpdate.nextPlayerIndex,
        eliminationOrder: stateUpdate.eliminationOrder,
        winner: stateUpdate.winner,
        gameStatus: stateUpdate.gameStatus
    }));
  };

  // ログを追加する関数
  const addLog = (updatedPlayers: Player[], cardIndex: number, guessedSuit: string, guessedNumber: number, isCorrect: boolean) => {
    const currentPlayer = updatedPlayers[gameState.currentPlayerIndex];
    const targetPlayerIndex = getNextTargetPlayerIndex(gameState.currentPlayerIndex);
    const targetPlayer = updatedPlayers[targetPlayerIndex];

    const newLog: GameLog = {
      guessingPlayer: currentPlayer.name,
      targetPlayer: targetPlayer.name,
      cardIndex: cardIndex,
      guessedSuit: guessedSuit,
      guessedNumber: guessedNumber,
      isCorrect: isCorrect,
      timestamp: Date.now()
    };

    return [...gameState.logs, newLog];
  };

  // handleGuess関数の正解時の処理を修正
  const handleGuess = (guessedNumber: number) => {
    if (!selectedCard || !selectedSuit) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const targetPlayer = gameState.players[selectedCard.playerIndex];
    const targetCard = targetPlayer.cards[selectedCard.cardIndex];
    
    const updatedPlayers = [...gameState.players];
    const isCorrect = targetCard.number === guessedNumber && targetCard.suit === selectedSuit;

    // ログを追加
    const updatedLogs = [...gameState.logs, {
      guessingPlayer: currentPlayer.name,
      targetPlayer: targetPlayer.name,
      cardIndex: selectedCard.cardIndex,
      guessedSuit: selectedSuit,
      guessedNumber: guessedNumber,
      isCorrect: isCorrect,
      timestamp: Date.now()
    }];

    if (isCorrect) {
      updatedPlayers[selectedCard.playerIndex].cards[selectedCard.cardIndex].isRevealed = true;
      playCorrectSound();
      
      // まず状態を更新
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        logs: updatedLogs
      }));
      
      // ゲーム終了判定を先に行う
      const isGameFinished = updatedPlayers.filter(player =>
        player.cards.some(card => !card.isRevealed)
      ).length === 1;

      if (isGameFinished) {
        // ゲーム終了時はComputerActionDialogを使用
        setComputerAction({
          player: currentPlayer.name,
          targetPlayer: targetPlayer.name,
          cardIndex: selectedCard.cardIndex,
          guessedCard: { suit: selectedSuit, number: guessedNumber },
          isCorrect: true,
          updatedPlayers,
          nextPlayerIndex: getNextPlayerIndex(gameState.currentPlayerIndex),
          willContinue: false  // ゲーム終了時は常にfalse
        });
        setShowComputerActionDialog(true);
        
        // ゲーム終了時の状態を即座に更新
        const stateUpdate = checkGameState(updatedPlayers, gameState.currentPlayerIndex);
        setGameState(prev => ({
          ...prev,
          players: updatedPlayers,
          gameStatus: stateUpdate.gameStatus,
          winner: stateUpdate.winner,
          currentPlayerIndex: stateUpdate.nextPlayerIndex,
          eliminationOrder: stateUpdate.eliminationOrder,
          logs: updatedLogs
        }));
      } else {
        setCorrectGuessPlayers(updatedPlayers);
        setShowContinueDialog(true);
      }
    } else {
      // 不正解時も同様に、効果音を先に再生してからダイアログを表示
      playIncorrectSound();
      if (currentPlayer.isComputer) {
        // コンピュータの処理は変更なし
        const unrevealedCards = currentPlayer.cards
          .map((card, index) => ({ card, index }))
          .filter(item => !item.card.isRevealed);

        if (unrevealedCards.length > 0) {
          const randomCard = unrevealedCards[Math.floor(Math.random() * unrevealedCards.length)];
          updatedPlayers[gameState.currentPlayerIndex].cards[randomCard.index].isRevealed = true;
          setGameState(prev => ({
            ...prev,
            players: updatedPlayers,
            currentPlayerIndex: getNextPlayerIndex(prev.currentPlayerIndex),
            logs: updatedLogs
          }));
        }
      } else {
        // ゲーム終了判定を追加
        const isGameFinished = updatedPlayers.filter(player =>
          player.cards.some(card => !card.isRevealed)
        ).length === 1;

        if (isGameFinished) {
          // ゲーム終了時はComputerActionDialogを使用
          setComputerAction({
            player: currentPlayer.name,
            targetPlayer: targetPlayer.name,
            cardIndex: selectedCard.cardIndex,
            guessedCard: { suit: selectedSuit, number: guessedNumber },
            isCorrect: false,
            updatedPlayers,
            nextPlayerIndex: getNextPlayerIndex(gameState.currentPlayerIndex),
            willContinue: false
          });
          setShowComputerActionDialog(true);
        } else {
          setIsSelectingOwnCard(true);
        }
        setGameState(prev => ({
          ...prev,
          logs: updatedLogs
        }));
      }
    }

    setSelectedCard(null);
    setSelectedSuit(null);
    setShowNumberDialog(false);
  };

  // handleContinueChoice関数を更新
  const handleContinueChoice = (shouldContinue: boolean) => {
    console.log('=== DEBUG: Continue Choice ===');
    console.log('Current Player:', gameState.players[gameState.currentPlayerIndex].name);
    console.log('Should Continue:', shouldContinue);
    
    let nextIndex;
    if (shouldContinue) {
        nextIndex = gameState.currentPlayerIndex;
    } else {
        nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
        while (gameState.players[nextIndex]?.cards.every(card => card.isRevealed)) {
            nextIndex = (nextIndex + 1) % gameState.players.length;
            if (nextIndex === gameState.currentPlayerIndex) break;
        }
    }
    
    console.log('Next Player:', gameState.players[nextIndex].name);
    console.log('=== END DEBUG ===');

    const stateUpdate = checkGameState(correctGuessPlayers, nextIndex);
    
    setGameState(prev => ({
        ...prev,
        players: correctGuessPlayers,
        currentPlayerIndex: nextIndex,
        eliminationOrder: stateUpdate.eliminationOrder,
        winner: stateUpdate.winner,
        gameStatus: stateUpdate.gameStatus,
        logs: prev.logs.map((log, index) => 
            index === prev.logs.length - 1 ? 
            { ...log, willContinue: shouldContinue } : 
            log
        )
    }));

    setShowContinueDialog(false);
    setCorrectGuessPlayers([]);
  };

  // 正解時の選択ダイアログコンポーネント
  const ContinueDialog = () => {
    if (!showContinueDialog) return null;

    // キーボードイベントのハンドラーを追加
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'KeyC') {
          handleContinueChoice(true);  // Continue
        } else if (e.code === 'KeyN') {
          handleContinueChoice(false); // Next player
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
      <Draggable handle=".dialog-header">
        <div className="guess-dialog continue-dialog">
          <div className="dialog-header">
            <h3>正解！次の行動を選んでください</h3>
          </div>
          <div className="continue-options">
            <button 
              className="continue-button"
              onClick={() => handleContinueChoice(true)}
            >
              続けて予想する (C)
            </button>
            <button 
              className="next-player-button"
              onClick={() => handleContinueChoice(false)}
            >
              次のプレイヤーに回す (N)
            </button>
          </div>
        </div>
      </Draggable>
    );
  };

  const handleOwnCardSelect = (cardIndex: number) => {
    if (isSelectingOwnCard) {  // ガード条件を追加
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].cards[cardIndex].isRevealed = true;
      
      endTurn(updatedPlayers);
      setIsSelectingOwnCard(false);  // フラグをリセット
    }
  };

  // startGame関数を更新
  const startGame = () => {
    if (!playerName) {
      alert('プレイヤー名を入力してください。');
      return;
    }
    if (playerName.length > 10) {
      alert('プレイヤー名は10文字以内で入力してください。');
      return;
    }

    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const numbers = Array.from({ length: 13 }, (_, i) => (i + 1) as CardNumber);
    const allCards = suits.flatMap(suit =>
      numbers.map(number => ({ suit, number, isRevealed: false }))
    );

    const shuffledCards = shuffleCards([...allCards]);
    const cardsPerPlayer = 13;

    const players: Player[] = [
      {
        id: 0,
        name: playerName,
        isComputer: false,
        cards: shuffledCards.slice(0, cardsPerPlayer).sort((a, b) => a.number - b.number)
      },
      {
        id: 1,
        name: 'Computer 1',
        isComputer: true,
        personalityType: computerSettings[1].personalityType,
        skillLevel: computerSettings[1].skillLevel,
        cards: shuffledCards.slice(cardsPerPlayer, cardsPerPlayer * 2).sort((a, b) => a.number - b.number)
      },
      {
        id: 2,
        name: 'Computer 2',
        isComputer: true,
        personalityType: computerSettings[2].personalityType,
        skillLevel: computerSettings[2].skillLevel,
        cards: shuffledCards.slice(cardsPerPlayer * 2, cardsPerPlayer * 3).sort((a, b) => a.number - b.number)
      },
      {
        id: 3,
        name: 'Computer 3',
        isComputer: true,
        personalityType: computerSettings[3].personalityType,
        skillLevel: computerSettings[3].skillLevel,
        cards: shuffledCards.slice(cardsPerPlayer * 3, cardsPerPlayer * 4).sort((a, b) => a.number - b.number)
      }
    ];

    // ======================================================================
    // テスト用の一時的な変更: プレイヤーごとに異なる範囲のカードを表向きにする
    // プレイヤー1とComputer1: 1-12枚目が表
    // Computer2とComputer3: 2-13枚目が表
    // この部分は動作確認後に削除してください
    // ======================================================================
    players.forEach((player, playerIndex) => {
      player.cards.forEach((card, cardIndex) => {
        if (playerIndex <= 1) {  // プレイヤー1とComputer1
          if (cardIndex < 12) {  // 1-12枚目を表向きに
            card.isRevealed = true;
          }
        } else {  // Computer2とComputer3
          if (cardIndex > 0) {  // 2-13枚目を表向きに
            card.isRevealed = true;
          }
        }
      });
    });
    // ======================================================================

    setGameState({
      players,
      currentPlayerIndex: 0,
      gameStatus: 'playing',
      winner: null,
      logs: [],
      eliminationOrder: []
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      startGame();
    }
  };

  // コンピュータープレイヤーのターン処理を更新
  useEffect(() => {
    if (gameState.gameStatus !== 'playing') return;
    if (!gameState.players[gameState.currentPlayerIndex]?.isComputer) return;
    if (showComputerActionDialog) return;  // ダイアログ表示中は次のターンを実行しない

    const timeoutId = setTimeout(() => {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const nextTargetIndex = getNextTargetPlayerIndex(gameState.currentPlayerIndex);
      
      // 次のターゲットが見つからない場合（ゲーム終了）
      if (nextTargetIndex === -1) {
        const stateUpdate = checkGameState(gameState.players, gameState.currentPlayerIndex);
        setGameState(prev => ({
          ...prev,
          gameStatus: stateUpdate.gameStatus,
          winner: stateUpdate.winner,
          players: prev.players,
          currentPlayerIndex: stateUpdate.nextPlayerIndex,
          eliminationOrder: stateUpdate.eliminationOrder,
          logs: prev.logs
        }));
        return;
      }

      const nextPlayer = gameState.players[nextTargetIndex];
      
      // 戦略的に位置を選択
      const selectedPosition = selectCardPosition(nextPlayer, gameState, currentPlayer.skillLevel);
      
      if (selectedPosition !== null) {
        // 選択したカードを設定
        setSelectedCard({ playerIndex: nextTargetIndex, cardIndex: selectedPosition });

        const guess = computerGuess(gameState, nextPlayer, selectedPosition, gameState.currentPlayerIndex);
        
        // guessがnullの場合は、まだ公開されていないカードの中からランダムに選択
        let fallbackGuess: { suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'; number: number } | null = null;
        if (!guess) {
          // 全プレイヤーの公開済みカードを収集
          const revealedCards = gameState.players.flatMap(player => 
            player.cards
              .filter(card => card.isRevealed)
              .map(card => ({ suit: card.suit, number: card.number }))
          );

          // まだ公開されていないカードの組み合わせを生成
          const possibleCards: Array<{ suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'; number: number }> = [];
          const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
          for (let number = 1; number <= 13; number++) {
            for (const suit of suits) {
              // 既に公開されているカードは除外
              if (!revealedCards.some(card => card.suit === suit && card.number === number)) {
                possibleCards.push({ suit, number });
                }
            }
          }

          // 可能なカードがある場合はランダムに1つ選択
          if (possibleCards.length > 0) {
            fallbackGuess = possibleCards[Math.floor(Math.random() * possibleCards.length)];
          } else {
            // 可能なカードがない場合（通常はありえない）
            console.error('No possible cards available for fallback guess');
            setSelectedCard(null);
            return;
          }
        }

        const finalGuess = guess || fallbackGuess;
        if (!finalGuess) {
          console.error('Both guess and fallback guess are null');
          setSelectedCard(null);
          return;
        }

        const targetCard = nextPlayer.cards[selectedPosition];
        const isCorrect = targetCard.number === finalGuess.number && targetCard.suit === finalGuess.suit;

        // 効果音を再生（正解/不正解に応じて）
        if (isCorrect) {
          playCorrectSound();
        } else {
          playIncorrectSound();
        }

        const updatedPlayers = [...gameState.players];
        const updatedLogs = addLog(
          updatedPlayers,
          selectedPosition,
          finalGuess.suit,
          finalGuess.number,
          isCorrect
        );

        if (isCorrect) {
          updatedPlayers[nextTargetIndex].cards[selectedPosition].isRevealed = true;
          
          // ゲーム終了判定
          const isGameFinished = updatedPlayers.filter(player =>
            player.cards.some(card => !card.isRevealed)
          ).length === 1;

          // コンピュータープレイヤーの決定（ゲーム終了時は常にfalse）
          const willContinue = isGameFinished ? false : decideToContinue(currentPlayer, gameState);
          
          // コンピュータの行動を記録
          setComputerAction({
            player: currentPlayer.name,
            targetPlayer: nextPlayer.name,
            cardIndex: selectedPosition,
            guessedCard: finalGuess,
            isCorrect,
            updatedPlayers,
            nextPlayerIndex: willContinue ? gameState.currentPlayerIndex : getNextPlayerIndex(gameState.currentPlayerIndex),
            willContinue
          });

          // ゲーム状態の更新
          if (isGameFinished) {
            // ゲーム終了時は即座に状態を更新
            const stateUpdate = checkGameState(updatedPlayers, gameState.currentPlayerIndex);
            setGameState(prev => ({
              ...prev,
              logs: updatedLogs,
              players: updatedPlayers,
              gameStatus: stateUpdate.gameStatus,
              winner: stateUpdate.winner,
              currentPlayerIndex: stateUpdate.nextPlayerIndex,
              eliminationOrder: stateUpdate.eliminationOrder
            }));
          } else {
            setGameState(prev => ({
              ...prev,
              logs: updatedLogs,
              players: updatedPlayers
            }));
          }

          setShowComputerActionDialog(true);
        } else {
          const unrevealedOwnCards = currentPlayer.cards
            .map((card, index) => ({ card, index }))
            .filter(item => !item.card.isRevealed);

          if (unrevealedOwnCards.length > 0) {
            const randomOwnCard = unrevealedOwnCards[Math.floor(Math.random() * unrevealedOwnCards.length)];
            updatedPlayers[gameState.currentPlayerIndex].cards[randomOwnCard.index].isRevealed = true;
            // 選択したカードと表にするカードの両方を設定
            setSelectedCard({
              playerIndex: nextTargetIndex,
              cardIndex: selectedPosition,
              revealedCardIndex: randomOwnCard.index,
              revealedPlayerIndex: gameState.currentPlayerIndex
            });
          }
          
          // 不正解の場合は必ず次のプレイヤーに移動
          setComputerAction({
            player: currentPlayer.name,
            targetPlayer: nextPlayer.name,
            cardIndex: selectedPosition,
            guessedCard: finalGuess,
            isCorrect,
            updatedPlayers,
            nextPlayerIndex: getNextPlayerIndex(gameState.currentPlayerIndex),
            willContinue: false
          });

          // ゲーム状態の更新
          setGameState(prev => ({
            ...prev,
            logs: updatedLogs,
            players: updatedPlayers
          }));

          setShowComputerActionDialog(true);
        }
      } else {
        // 予想できるカードがない場合は次のプレイヤーへ
        setGameState(prev => ({
          ...prev,
          currentPlayerIndex: getNextPlayerIndex(prev.currentPlayerIndex)
        }));
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [gameState, showComputerActionDialog]);

  const handleDragStop = (e: any, data: { x: number; y: number }) => {
    setDialogPosition({ x: data.x, y: data.y });
  };

  // ゲームログを表示するコンポーネントを更新
  const GameLogs = () => (
    <div className="game-logs">
      <h3>
        ゲーム履歴
        {(showComputerActionDialog || gameState.gameStatus === 'finished') && 
         gameState.logs[gameState.logs.length - 1]?.isCorrect && 
          ' (Space / Enter で次へ)'}
      </h3>
      <div className="logs-container">
        {gameState.logs.slice().reverse().map((log, index) => (
          <div key={log.timestamp} className={`log-item ${log.isCorrect ? 'correct' : 'incorrect'}`}>
            <div className="log-header">
              <span className="log-number">{gameState.logs.length - index}.</span>
              <span className="player-name">{log.guessingPlayer}</span>が
              <span className="player-name">{log.targetPlayer}</span>の
            </div>
            <div className="log-content">
              {log.cardIndex + 1}枚目のカードを{getDisplayCard(log.guessedSuit, log.guessedNumber)}と予想
              <span className="result-symbol">{log.isCorrect ? '○' : '×'}</span>
            </div>
            {log.isCorrect && log.willContinue !== undefined && 
              (gameState.gameStatus !== 'finished' || index !== 0) && (
              <div className="log-content continuation-status">
                → {log.willContinue ? '続けて予想' : '次のプレイヤーに交代'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // コンピュータのアクション表示ダイアログ
  const ComputerActionDialog = () => {
    if (!computerAction || !showComputerActionDialog) return null;

    // ゲーム終了判定
    const isGameFinished = computerAction.updatedPlayers.filter(player =>
      player.cards.some(card => !card.isRevealed)
    ).length === 1;

    // ゲーム終了でない場合は、ダイアログ表示時点でログを更新
    useEffect(() => {
      if (computerAction.isCorrect && !isGameFinished) {
        setGameState(prev => ({
          ...prev,
          logs: prev.logs.map((log, index) => 
            index === prev.logs.length - 1 ? { ...log, willContinue: computerAction.willContinue } : log
          )
        }));
      }
    }, []);

    const handleContinue = () => {
      console.log('=== DEBUG: Computer Action Continue ===');
      console.log('Current Player:', gameState.players[gameState.currentPlayerIndex].name);
      console.log('Will Continue:', computerAction?.willContinue);
      
      let nextIndex;
      if (computerAction?.willContinue) {
          nextIndex = gameState.currentPlayerIndex;
      } else {
          nextIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
          while (gameState.players[nextIndex]?.cards.every(card => card.isRevealed)) {
              nextIndex = (nextIndex + 1) % gameState.players.length;
              if (nextIndex === gameState.currentPlayerIndex) break;
          }
      }
      
      console.log('Next Player:', gameState.players[nextIndex].name);
      console.log('=== END DEBUG ===');

      // ゲーム終了時のみログを更新
      setGameState(prev => ({
          ...prev,
          logs: isGameFinished ? prev.logs.map((log, index) => 
              index === prev.logs.length - 1 ? { ...log, willContinue: computerAction?.willContinue } : log
          ) : prev.logs,
          players: computerAction?.updatedPlayers || prev.players,
          currentPlayerIndex: nextIndex
      }));
      setShowComputerActionDialog(false);
      setSelectedCard(null);  // 選択状態をリセット
      
      // ゲーム終了判定
      if (computerAction) {
          const stateUpdate = checkGameState(computerAction.updatedPlayers, nextIndex);
          setGameState(prev => ({
              ...prev,
              gameStatus: stateUpdate.gameStatus,
              winner: stateUpdate.winner,
              players: prev.players,
              currentPlayerIndex: nextIndex,
              eliminationOrder: stateUpdate.eliminationOrder,
              logs: prev.logs
          }));
      }
    };

    useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleContinue();
        }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }, [computerAction]);

    return null;
  };

  // プレイヤーの統計情報を計算する関数を追加
  const calculatePlayerStats = (playerName: string) => {
    const playerGuesses = gameState.logs.filter(log => log.guessingPlayer === playerName);
    const correctGuesses = playerGuesses.filter(log => log.isCorrect);
    const incorrectGuesses = playerGuesses.filter(log => !log.isCorrect);
    const accuracy = playerGuesses.length > 0 
      ? Math.round((correctGuesses.length / playerGuesses.length) * 100) 
      : 0;

    return {
      total: playerGuesses.length,
      correct: correctGuesses.length,
      incorrect: incorrectGuesses.length,
      accuracy
    };
  };

  // プレイヤーの順位を計算する関数を更新
  const calculatePlayerRanks = () => {
    const ranks = new Map();
    
    // 勝者（最後まで残ったプレイヤー）は1位
    if (gameState.winner) {
      ranks.set(gameState.winner.id, 1);
    }
    
    // 脱落順に基づいて順位を設定
    // 最初に脱落（配列の最初の要素）が4位、最後に脱落（配列の最後の要素）が2位
    gameState.eliminationOrder.forEach((playerId, index) => {
      ranks.set(playerId, 4 - index);
    });

    // デバッグ用のログ出力
    console.log('Ranks:', {
      winner: gameState.winner?.name,
      eliminationOrder: gameState.eliminationOrder.map(id => ({
        name: gameState.players.find(p => p.id === id)?.name,
        rank: ranks.get(id)
      }))
    });

    return ranks;
  };

  // 統計情報を表示するコンポーネント
  const PlayerStats = ({ player, rank }: { player: Player; rank: number | undefined }) => {
    const stats = calculatePlayerStats(player.name);

    // コンピューターの強さと性格タイプを日本語に変換
    const getSkillLevelJP = (level?: string) => {
      switch (level) {
        case 'beginner': return '初級';
        case 'intermediate': return '中級';
        case 'expert': return '上級';
        default: return '';
      }
    };

    const getPersonalityTypeJP = (type?: string) => {
      switch (type) {
        case 'aggressive': return '積極的';
        case 'balanced': return 'バランス型';
        case 'cautious': return '慎重';
        default: return '';
      }
    };
    
    return (
      <div className="player-stats">
        <div className={`player-rank ${rank === 1 ? 'first' : ''}`}>
          {rank ? `${rank}位${rank === 1 ? ' 👑' : ''}` : '未定'}
        </div>
        <h3>
          {player.name}
          {player.isComputer && (
            <span className="computer-info">
              ({getSkillLevelJP(player.skillLevel)} / {getPersonalityTypeJP(player.personalityType)})
            </span>
          )}
        </h3>
        <div className="stats-item">
          <span className="stats-label">予想回数:</span>
          <span className="stats-value">{stats.total}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">正解:</span>
          <span className="stats-value good">{stats.correct}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">不正解:</span>
          <span className="stats-value bad">{stats.incorrect}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">正答率:</span>
          <span className="stats-value">
            {stats.accuracy}%
          </span>
        </div>
      </div>
    );
  };

  const handleTestStart = async () => {
    setIsTestRunning(true);
    try {
      console.log('テストを開始します...');
      await runTest();
    } catch (error) {
      console.error('テスト実行中にエラーが発生しました:', error);
    } finally {
      setIsTestRunning(false);
    }
  };

  const handleTestStop = () => {
    console.log('テストを中断します...');
    stopTest();
    setIsTestRunning(false);
  };

  // コンピューター設定のUIを更新
  const ComputerSettingsUI = () => (
    <div className="computer-settings">
      <h2>コンピューターの設定</h2>
      <div className="computer-settings-list">
        {[1, 2, 3].map(id => (
          <div key={id} className="computer-setting-item">
            <label>Computer {id}:</label>
            <div className="computer-setting-controls">
              <select
                value={computerSettings[id].skillLevel}
                onChange={(e) => handleComputerSkillChange(id, e.target.value as Player['skillLevel'])}
                className="skill-select"
              >
                <option value="beginner">初級</option>
                <option value="intermediate">中級</option>
                <option value="expert">上級</option>
              </select>
              <select
                value={computerSettings[id].personalityType}
                onChange={(e) => handleComputerPersonalityChange(id, e.target.value as Player['personalityType'])}
                className="personality-select"
              >
                <option value="aggressive">積極的</option>
                <option value="balanced">バランス型</option>
                <option value="cautious">慎重</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // キーボードショートカットのヘルプコンポーネント
  const CardSelectionHelp = () => (
    <div className="help-icon">
      ℹ️
      <div className="tooltip">
        <h4>キーボードショートカット</h4>
        <ul>
          <li>1-9枚目 <span className="key">1</span>-<span className="key">9</span></li>
          <li>10枚目 <span className="key">0</span></li>
          <li>11枚目 <span className="key">J</span></li>
          <li>12枚目 <span className="key">Q</span></li>
          <li>13枚目 <span className="key">K</span></li>
        </ul>
      </div>
    </div>
  );

  // グローバルなキーボードイベントハンドラー
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ゲーム終了時の処理
      if (gameState.gameStatus === 'finished' && gameState.logs[gameState.logs.length - 1]?.isCorrect) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          setGameState(prev => ({
            ...prev,
            showEndScreen: true
          }));
          return;
        }
      }

      // ダイアログ表示中の処理
      if (showSuitDialog) {
        switch (e.key.toLowerCase()) {
          case 'h':
            handleSuitSelect('hearts');
            break;
          case 'd':
            handleSuitSelect('diamonds');
            break;
          case 'c':
            handleSuitSelect('clubs');
            break;
          case 's':
            handleSuitSelect('spades');
            break;
          case 'escape':
            handleCancelSelection();
            break;
        }
        return;
      }

      if (showNumberDialog) {
        const key = e.key.toLowerCase();
        const numberMap: { [key: string]: number } = {
          'a': 1, '1': 1,
          '2': 2, '3': 3, '4': 4, '5': 5,
          '6': 6, '7': 7, '8': 8, '9': 9,
          '0': 10,
          'j': 11,
          'q': 12,
          'k': 13
        };

        if (key in numberMap) {
          handleGuess(numberMap[key]);
        } else if (key === 'escape') {
          handleCancelSelection();
        } else if (key === 'backspace') {
          handleBackToSuit();
        }
        return;
      }

      // カード選択の処理（ダイアログが表示されていない時のみ）
      if (!showSuitDialog && !showNumberDialog && !showContinueDialog) {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (!currentPlayer) return;

        const keyToIndex: { [key: string]: number } = {
          '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
          '6': 5, '7': 6, '8': 7, '9': 8, '0': 9,
          'j': 10, 'q': 11, 'k': 12
        };

        const key = e.key.toLowerCase();
        if (key in keyToIndex) {
          const cardIndex = keyToIndex[key];
          
          if (isSelectingOwnCard) {
            // 自分のカードを選択する場合
            if (gameState.currentPlayerIndex === 0 && !currentPlayer.cards[cardIndex].isRevealed) {
              handleOwnCardSelect(cardIndex);
            }
          } else {
            // 予想対象のカードを選択する場合
            const targetPlayerIndex = getNextTargetPlayerIndex(gameState.currentPlayerIndex);
            if (gameState.currentPlayerIndex === 0 && targetPlayerIndex !== -1) {
              const targetPlayer = gameState.players[targetPlayerIndex];
              if (!targetPlayer.cards[cardIndex].isRevealed) {
                handleCardSelect(targetPlayerIndex, cardIndex);
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isSelectingOwnCard, showSuitDialog, showNumberDialog, showContinueDialog, selectedSuit]);

  // ダイアログ外クリックのハンドラーを追加
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // showContinueDialogがtrueの場合は何もしない（このダイアログは外クリックで閉じない）
      if (showContinueDialog) return;

      // スート予想ダイアログまたは数字予想ダイアログが表示されている場合のみ処理
      if (showSuitDialog || showNumberDialog) {
        const dialogElement = dialogRef;
        if (dialogElement && !dialogElement.contains(e.target as Node)) {
          handleCancelSelection();
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showSuitDialog, showNumberDialog, showContinueDialog, dialogRef]);

  return (
    <div className="game-container">
      <div className="game-main">
        <h1>カードハンター</h1>
        
        {gameState.gameStatus === 'waiting' ? (
          <div className="setup-container">
            <div className="game-rules">
              <h2>ゲームのルール</h2>
              <div className="rules-content">
                <h3>ゲームの概要</h3>
                <ul>
                  <li>プレイヤー人数: 4人（あなた＆コンピューター3人）</li>
                  <li>推定プレイ時間: 5-10分</li>
                  <li>対象年齢: 6歳以上</li>
                  <li>使用カード: トランプ52枚（ジョーカーなし）</li>
                </ul>
                
                <h3>ゲームの目的</h3>
                <ul>
                  <li>相手のカードを予想して表にしながら、自分のカードをできるだけ裏向きのまま保ちます。</li>
                  <li>最後まで裏向きのカードを持っているプレイヤーが勝者となります！</li>
                </ul>
                
                <h3>ゲームの準備</h3>
                <ol>
                  <li>シャッフルしたカードを各プレイヤーに13枚ずつ配ります</li>
                  <li>配られたカードは自動的に数字順に並びます（A=1, J=11, Q=12, K=13）</li>
                  <li>自分のカードは見ることができますが、他のプレイヤーのカードは初めは全て裏向きです</li>
                </ol>

                <h3>ターンの進め方</h3>
                <ol>
                  <li>予想フェーズ
                    <ul>
                      <li>次のプレイヤーの裏向きのカードを1枚選びます</li>
                      <li>選んだカードの「スート（♥♦♣♠）」と「数字（A-K）」を予想します</li>
                      <li>例: 「6番目のカードは♥7です」</li>
                    </ul>
                  </li>
                  <li>結果フェーズ
                    <ul>
                      <li>予想が当たった場合：
                        <ul>
                          <li>予想したカードが表向きになります</li>
                          <li>2つの選択肢があります:
                            <ol>
                              <li>カードの予想を続ける</li>
                              <li>次のプレイヤーにターンを回す</li>
                            </ol>
                          </li>
                        </ul>
                      </li>
                      <li>予想が外れた場合：
                        <ul>
                          <li>自分の裏向きのカードを1枚選んで表にします</li>
                          <li>次のプレイヤーのターンになります</li>
                        </ul>
                      </li>
                    </ul>
                  </li>
                </ol>

                <h3>ゲームの終了</h3>
                <ul>
                  <li>全てのカードが表向きになったプレイヤーから順に脱落です</li>
                  <li>最後まで裏向きのカードを持っているプレイヤーが1位となります</li>
                </ul>

                {/* <h3>プレイのコツ</h3>
                <ul>
                  <li>既に表になっているカードの情報を元に裏のカードを推理しましょう</li>
                  <li>過去の予想結果も推理に役立ちます</li>
                  <li>予想を続けるか回すかの判断も重要です</li>
                </ul> */}

                <h3>キーボードショートカット</h3>
                <ul>
                  <li>ℹ️アイコンにカーソルを合わせるとキーボードショートカットのヘルプが表示されます</li>
                  <li>（　　）内に表示されているキーを押すと、その機能を実行できます</li>
                </ul>
              </div>
            </div>

            <div className="player-input">
              <label htmlFor="player-name">あなたの名前（10文字以内）</label>
              <input
                id="player-name"
                type="text"
                value={playerName}
                onChange={(e) => {
                  // 10文字以内に制限
                  if (e.target.value.length <= 10) {
                    setPlayerName(e.target.value);
                  }
                }}
                onKeyPress={handleKeyPress}
                maxLength={10}
                placeholder="10文字以内で入力"
              />
            </div>
            
            <ComputerSettingsUI />

            <div className="test-controls" style={{ marginTop: '20px', padding: '10px', backgroundColor: '#3d3d3d', borderRadius: '8px' }}>
              <h3 style={{ color: '#8bc34a', marginBottom: '10px' }}>AIテスト</h3>
              {!isTestRunning ? (
                <button 
                  onClick={handleTestStart}
                  className="start-test-button"
                >
                  AIシミュレーションを実行 (1ゲーム)
                </button>
              ) : (
                <button 
                  onClick={handleTestStop}
                  className="stop-test-button"
                >
                  テストを中断
                </button>
              )}
              <p style={{ color: '#bbb', fontSize: '14px', marginTop: '10px' }}>
                結果はブラウザのコンソールに表示されます
              </p>
            </div>

            <button onClick={startGame} className="start-button">ゲームを開始</button>
            
            <div className="players-list">
              <h2>参加プレイヤー:</h2>
              <div className="player-item">
                {playerName || 'プレイヤー1'}（あなた）
              </div>
              {[1, 2, 3].map(id => (
                <div key={id} className="player-item">
                  Computer {id}（{computerSettings[id].skillLevel === 'beginner' ? '初級' : 
                               computerSettings[id].skillLevel === 'intermediate' ? '中級' : '上級'} / {
                               computerSettings[id].personalityType === 'aggressive' ? '積極的' :
                                computerSettings[id].personalityType === 'cautious' ? '慎重' : 'バランス型'}）
                </div>
              ))}
            </div>
          </div>
        ) : gameState.gameStatus === 'finished' ? (
          <div>
            <div className="winner-message">
              <h2>🎉 ゲーム終了 🎉</h2>
              <h3>{gameState.winner?.name}の勝利！</h3>
              <button className="restart-button" onClick={resetGame}>
                もう一度遊ぶ
              </button>
            </div>

            {/* 順位を一度だけ計算 */}
            {(() => {
              const ranks = calculatePlayerRanks();
              return (
                <div className="game-stats">
                  {gameState.players.map((player) => (
                    <PlayerStats 
                      key={player.id} 
                      player={player} 
                      rank={ranks.get(player.id)}
                    />
                  ))}
                </div>
              );
            })()}

            <div className="game-end-container">
              <div className="game-end-main">
                <div className="game-board">
                  {gameState.players.map((player, playerIndex) => (
                    <div key={player.id} className="player-section">
                      <h2 className={`${(gameState.gameStatus === 'playing' && playerIndex === gameState.currentPlayerIndex) ? 'current-player' : ''} 
                                    ${(gameState.gameStatus === 'playing' && !isSelectingOwnCard && playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex)) ? 'target-player' : ''}`}>
                        {player.name}
                        {gameState.gameStatus === 'playing' && (
                          <>
                            {playerIndex === gameState.currentPlayerIndex ? ' (現在のプレイヤー) ' : ''}
                            {!isSelectingOwnCard && playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex) && 
                              (gameState.currentPlayerIndex === 0 && !selectedCard && !showContinueDialog && !showSuitDialog && !showNumberDialog ? 
                                <span>
                                  (予想対象) - 予想するカードを選んでください
                                  <CardSelectionHelp />
                                </span> : 
                                ' (予想対象)'
                              )}
                            {isSelectingOwnCard && playerIndex === gameState.currentPlayerIndex && 
                              <span className="incorrect-message">
                                - 不正解... 表にするカードを選んでください
                                <CardSelectionHelp />
                              </span>}
                          </>
                        )}
                      </h2>
                      <div className="player-cards">
                        {player.cards.map((card, cardIndex) => (
                          <Card
                            key={cardIndex}
                            card={card}
                            isHidden={playerIndex !== 0 && !card.isRevealed}
                            isSelected={
                              selectedCard?.playerIndex === playerIndex &&
                              selectedCard?.cardIndex === cardIndex ||
                              (selectedCard?.revealedPlayerIndex === playerIndex &&
                               selectedCard?.revealedCardIndex === cardIndex)
                            }
                            onClick={() => handleCardSelect(playerIndex, cardIndex)}
                            index={cardIndex}
                            isTarget={
                              selectedCard?.playerIndex === playerIndex &&
                              selectedCard?.cardIndex === cardIndex &&
                              (playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex) ||
                              showComputerActionDialog)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="game-end-logs">
                <h3>ゲーム履歴</h3>
                <div className="logs-container">
                  {gameState.logs.slice().reverse().map((log, index) => (
                    <div key={log.timestamp} className={`log-item ${log.isCorrect ? 'correct' : 'incorrect'}`}>
                      <div className="log-header">
                        <span className="log-number">{gameState.logs.length - index}.</span>
                        <span className="player-name">{log.guessingPlayer}</span>が
                        <span className="player-name">{log.targetPlayer}</span>の
                      </div>
                      <div className="log-content">
                        {log.cardIndex + 1}枚目のカードを{getDisplayCard(log.guessedSuit, log.guessedNumber)}と予想
                        <span className="result-symbol">{log.isCorrect ? '○' : '×'}</span>
                      </div>
                      {log.isCorrect && log.willContinue !== undefined && 
                        (gameState.gameStatus !== 'finished' || index !== 0) && (
                        <div className="log-content continuation-status">
                          → {log.willContinue ? '続けて予想' : '次のプレイヤーに交代'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="game-board">
            {gameState.players.map((player, playerIndex) => (
              <div key={player.id} className="player-section">
                <h2 className={`${(gameState.gameStatus === 'playing' && playerIndex === gameState.currentPlayerIndex) ? 'current-player' : ''} 
                              ${(gameState.gameStatus === 'playing' && !isSelectingOwnCard && playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex)) ? 'target-player' : ''}`}>
                  {player.name}
                  {gameState.gameStatus === 'playing' && (
                    <>
                      {playerIndex === gameState.currentPlayerIndex ? ' (現在のプレイヤー) ' : ''}
                      {!isSelectingOwnCard && playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex) && 
                        (gameState.currentPlayerIndex === 0 && !selectedCard && !showContinueDialog && !showSuitDialog && !showNumberDialog ? 
                          <span>
                            (予想対象) - 予想するカードを選んでください
                            <CardSelectionHelp />
                          </span> : 
                          ' (予想対象)'
                        )}
                      {isSelectingOwnCard && playerIndex === gameState.currentPlayerIndex && 
                        <span className="incorrect-message">
                          - 不正解... 表にするカードを選んでください
                          <CardSelectionHelp />
                        </span>}
                    </>
                  )}
                </h2>
                <div className="player-cards">
                  {player.cards.map((card, cardIndex) => (
                    <Card
                      key={cardIndex}
                      card={card}
                      isHidden={playerIndex !== 0 && !card.isRevealed}
                      isSelected={
                        selectedCard?.playerIndex === playerIndex &&
                        selectedCard?.cardIndex === cardIndex ||
                        (selectedCard?.revealedPlayerIndex === playerIndex &&
                         selectedCard?.revealedCardIndex === cardIndex)
                      }
                      onClick={() => handleCardSelect(playerIndex, cardIndex)}
                      index={cardIndex}
                      isTarget={
                        selectedCard?.playerIndex === playerIndex &&
                        selectedCard?.cardIndex === cardIndex &&
                        (playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex) ||
                        showComputerActionDialog)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}

            {showSuitDialog && (
              <Draggable 
                handle=".dialog-header" 
                position={dialogPosition}
                onStop={handleDragStop}
              >
                <div 
                  className="guess-dialog" 
                  tabIndex={-1}
                  ref={setDialogRef}
                  style={{ outline: 'none' }}
                  onClick={(e) => e.stopPropagation()}  // クリックの伝播を停止
                >
                  <div className="dialog-header">
                    <h3>カードのスートを予想してください</h3>
                  </div>
                  <div className="guess-buttons">
                    {[
                      { suit: 'hearts', key: 'H', label: '♥' },
                      { suit: 'diamonds', key: 'D', label: '♦' },
                      { suit: 'clubs', key: 'C', label: '♣' },
                      { suit: 'spades', key: 'S', label: '♠' }
                    ].map(({ suit, key, label }) => (
                      <button
                        key={suit}
                        onClick={() => handleSuitSelect(suit as CardType['suit'])}
                        className={`suit-button ${suit}`}
                      >
                        {label}
                        <span className="key-hint">({key})</span>
                      </button>
                    ))}
                  </div>
                  <button className="cancel-button" onClick={handleCancelSelection}>
                    キャンセル (Esc)
                  </button>
                </div>
              </Draggable>
            )}

            {showNumberDialog && (
              <Draggable 
                handle=".dialog-header" 
                position={dialogPosition}
                onStop={handleDragStop}
              >
                <div 
                  className="guess-dialog"
                  tabIndex={-1}
                  ref={setDialogRef}
                  style={{ outline: 'none' }}
                  onClick={(e) => e.stopPropagation()}  // クリックの伝播を停止
                >
                  <div className="dialog-header">
                    <h3>カードの数字を予想してください　</h3>
                    <div className="help-icon">
                      ℹ️
                      <div className="tooltip">
                        <h4>キーボードショートカット</h4>
                        <ul>
                          <li>A <span className="key">A</span> or <span className="key">1</span></li>
                          <li>2-9 <span className="key">2</span>-<span className="key">9</span></li>
                          <li>10 <span className="key">0</span></li>
                          <li>J <span className="key">J</span></li>
                          <li>Q <span className="key">Q</span></li>
                          <li>K <span className="key">K</span></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="selected-suit">
                    選択したスート: <span className={selectedSuit || ''}>{selectedSuit ? suitSymbols[selectedSuit] : ''}</span>
                  </div>
                  <div className="guess-buttons">
                    {['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          const numberMap: { [key: string]: number } = {
                            'A': 1, 'J': 11, 'Q': 12, 'K': 13
                          };
                          const guessedNumber = numberMap[num] || parseInt(num);
                          handleGuess(guessedNumber);
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <div className="dialog-buttons">
                    <button className="back-button" onClick={handleBackToSuit}>
                      戻る (Backspace)
                    </button>
                    <button className="cancel-button" onClick={handleCancelSelection}>
                      キャンセル (Esc)
                    </button>
                  </div>
                </div>
              </Draggable>
            )}
          </div>
        )}
      </div>

      {showComputerActionDialog && <ComputerActionDialog />}
      {showContinueDialog && <ContinueDialog />}
      
      {gameState.gameStatus === 'playing' && <GameLogs />}
    </div>
  )
}

export default App 
