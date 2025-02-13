import React, { useState, useEffect } from 'react'
import Draggable, { DraggableCore } from 'react-draggable'
import './App.css'
import { GameState, Player, Card as CardType, GameLog } from './types/game'
import { shuffleCards, getDisplayNumber, computerGuess } from './utils/cardUtils'
import Card from './components/Card'
import { makeStrategicGuess, decideToContinue } from './utils/computerStrategy'
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

  const [playerName, setPlayerName] = useState<string>('');
  const [selectedCard, setSelectedCard] = useState<{playerIndex: number, cardIndex: number} | null>(null);
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
    let nextIndex = (currentIndex + 1) % gameState.players.length;
    // 全てのカードが表になっているプレイヤーをスキップ
    while (gameState.players[nextIndex]?.cards.every(card => card.isRevealed)) {
      nextIndex = (nextIndex + 1) % gameState.players.length;
      // 一周してもプレイ可能なプレイヤーが見つからない場合は現在のインデックスを返す
      if (nextIndex === currentIndex) {
        return currentIndex;
      }
    }
    return nextIndex;
  };

  const getNextTargetPlayerIndex = (currentIndex: number): number => {
    let nextIndex = getNextPlayerIndex(currentIndex);
    // 全てのカードが表になっているプレイヤーをスキップ
    while (gameState.players[nextIndex]?.cards.every(card => card.isRevealed)) {
      nextIndex = getNextPlayerIndex(nextIndex);
      // 一周してもプレイ可能なプレイヤーが見つからない場合は-1を返す（ゲーム終了）
      if (nextIndex === currentIndex) {
        return -1;
      }
    }
    return nextIndex;
  };

  const handleCardSelect = (playerIndex: number, cardIndex: number) => {
    // ダイアログ表示中は新しいカードの選択を無効化
    if (showSuitDialog || showNumberDialog) {
      return;
    }

    // 自分のカードを選択するモード中の場合
    if (isSelectingOwnCard && playerIndex === gameState.currentPlayerIndex) {
      const card = gameState.players[playerIndex].cards[cardIndex];
      if (!card.isRevealed) {
        handleOwnCardSelect(cardIndex);
        setIsSelectingOwnCard(false);
      }
      return;
    }

    // 通常の予想モード
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
    setPlayerName('');
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
    // カードデッキを作成
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    const numbers = Array.from({ length: 13 }, (_, i) => i + 1);
    const allCards = suits.flatMap(suit =>
      numbers.map(number => ({ suit, number, isRevealed: false }))
    );

    // デッキをシャッフル
    const deck = shuffleCards(allCards);
    
    const players: Player[] = [
      {
        id: 0,
        name: playerName || 'test',
        cards: deck.slice(0, 13),
        isComputer: false
      },
      {
        id: 1,
        name: 'Computer 1',
        cards: deck.slice(13, 26),
        isComputer: true,
        personalityType: computerSettings[1].personalityType,
        skillLevel: computerSettings[1].skillLevel
      },
      {
        id: 2,
        name: 'Computer 2',
        cards: deck.slice(26, 39),
        isComputer: true,
        personalityType: computerSettings[2].personalityType,
        skillLevel: computerSettings[2].skillLevel
      },
      {
        id: 3,
        name: 'Computer 3',
        cards: deck.slice(39, 52),
        isComputer: true,
        personalityType: computerSettings[3].personalityType,
        skillLevel: computerSettings[3].skillLevel
      }
    ];

    // 各プレイヤーのカードを昇順にソート
    players.forEach(player => {
      player.cards.sort((a, b) => a.number - b.number);
    });

    return players;
  };

  // ゲーム終了の判定を更新
  const checkGameEnd = (players: Player[]) => {
    const playersWithUnrevealedCards = players.filter(player =>
      player.cards.some(card => !card.isRevealed)
    );

    if (playersWithUnrevealedCards.length === 1) {
      const winner = playersWithUnrevealedCards[0];
      
      // 脱落順を更新
      const updatedEliminationOrder = [...gameState.eliminationOrder];
      
      // まだ脱落順に含まれていないプレイヤーを追加
      const remainingPlayers = players.filter(player => 
        player.id !== winner.id && 
        !updatedEliminationOrder.includes(player.id)
      );
      
      // 残りのプレイヤーを脱落順に追加（最後に脱落したプレイヤーから順に）
      remainingPlayers.forEach(player => {
        if (!updatedEliminationOrder.includes(player.id)) {
          updatedEliminationOrder.push(player.id);
        }
      });

      setGameState(prev => ({
        ...prev,
        gameStatus: 'finished',
        winner: winner,
        players,
        currentPlayerIndex: prev.currentPlayerIndex,
        logs: prev.logs,
        eliminationOrder: updatedEliminationOrder
      }));
    }
  };

  // ターン終了時の処理を更新
  const endTurn = (updatedPlayers: Player[]) => {
    const nextIndex = getNextPlayerIndex(gameState.currentPlayerIndex);

    // 現在のプレイヤーが全カード表向きになった場合、脱落順に追加
    const currentPlayer = updatedPlayers[gameState.currentPlayerIndex];
    if (currentPlayer.cards.every(card => card.isRevealed) && 
        !gameState.eliminationOrder.includes(currentPlayer.id)) {
      // 脱落順を更新
      const updatedEliminationOrder = [...gameState.eliminationOrder, currentPlayer.id];
      
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        currentPlayerIndex: nextIndex,
        eliminationOrder: updatedEliminationOrder
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        currentPlayerIndex: nextIndex
      }));
    }
    
    checkGameEnd(updatedPlayers);
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

  // handleGuess関数を更新
  const handleGuess = (guessedNumber: number) => {
    if (!selectedCard || !selectedSuit) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const targetPlayer = gameState.players[selectedCard.playerIndex];
    const targetCard = targetPlayer.cards[selectedCard.cardIndex];
    
    const updatedPlayers = [...gameState.players];
    const isCorrect = targetCard.number === guessedNumber && targetCard.suit === selectedSuit;

    // ログを追加
    const updatedLogs = addLog(
      updatedPlayers,
      selectedCard.cardIndex,
      selectedSuit,
      guessedNumber,
      isCorrect
    );

    if (isCorrect) {
      updatedPlayers[selectedCard.playerIndex].cards[selectedCard.cardIndex].isRevealed = true;
      alert('正解！相手のカードを表にします。\n\n(Enter / Space / OK で閉じる)');
      
      // 対象プレイヤーの全カードが表になったかチェック
      const targetPlayerAllRevealed = updatedPlayers[selectedCard.playerIndex].cards.every(card => card.isRevealed);
      
      // 生存プレイヤー数をカウント
      const survivingPlayers = updatedPlayers.filter(player => 
        !player.cards.every(card => card.isRevealed)
      );

      if (targetPlayerAllRevealed) {
        // 脱落順を更新
        const updatedEliminationOrder = [...gameState.eliminationOrder];
        if (!updatedEliminationOrder.includes(targetPlayer.id)) {
          updatedEliminationOrder.push(targetPlayer.id);
        }

        // 生存プレイヤーが1人（自分だけ）になった場合はゲーム終了
        if (survivingPlayers.length === 1) {
          setGameState(prev => ({
            ...prev,
            players: updatedPlayers,
            gameStatus: 'finished',
            winner: survivingPlayers[0],
            logs: updatedLogs,
            eliminationOrder: updatedEliminationOrder
          }));
          return;
        }
      }
      
      // 正解時は選択ダイアログを表示するために状態を更新
      setCorrectGuessPlayers(updatedPlayers);
      setShowContinueDialog(true);
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        logs: updatedLogs,
        eliminationOrder: targetPlayerAllRevealed ? 
          [...prev.eliminationOrder, targetPlayer.id] : 
          prev.eliminationOrder
      }));
    } else {
      alert('不正解... 自分のカードを1枚クリックして表にしてください。\n\n(Enter / Space / OK で閉じる)');
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
        setIsSelectingOwnCard(true);
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

  // 正解後の選択を処理する関数を追加
  const handleContinueChoice = (shouldContinue: boolean) => {
    if (shouldContinue) {
      // 続けて予想する場合は、ダイアログを閉じるだけ
      setShowContinueDialog(false);
    } else {
      // 次のプレイヤーに回す場合
      setGameState(prev => ({
        ...prev,
        players: correctGuessPlayers,
        currentPlayerIndex: getNextPlayerIndex(prev.currentPlayerIndex)
      }));
      setShowContinueDialog(false);
    }
    setCorrectGuessPlayers([]);
  };

  // 正解時の選択ダイアログコンポーネント
  const ContinueDialog = () => {
    if (!showContinueDialog) return null;

    return (
      <Draggable handle=".dialog-header">
        <div className="guess-dialog continue-dialog">
          <div className="dialog-header">
            <h3>正解！次の行動を選んでください</h3>
            <div className="drag-handle">⋮⋮</div>
          </div>
          <div className="continue-options">
            <button 
              className="continue-button"
              onClick={() => handleContinueChoice(true)}
            >
              続けて予想する
            </button>
            <button 
              className="next-player-button"
              onClick={() => handleContinueChoice(false)}
            >
              次のプレイヤーに回す
            </button>
          </div>
        </div>
      </Draggable>
    );
  };

  const handleOwnCardSelect = (cardIndex: number) => {
    const updatedPlayers = [...gameState.players];
    updatedPlayers[gameState.currentPlayerIndex].cards[cardIndex].isRevealed = true;
    
    endTurn(updatedPlayers);
  };

  // startGame関数を更新
  const startGame = () => {
    if (!playerName) {
      alert('プレイヤー名を入力してください。');
      return;
    }

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
        checkGameEnd(gameState.players);
        return;
      }

      const nextPlayer = gameState.players[nextTargetIndex];
      
      // 表になっていないカードのインデックスを取得
      const unrevealedCards = nextPlayer.cards
        .map((card, index) => ({ card, index }))
        .filter(item => !item.card.isRevealed);
      
      if (unrevealedCards.length > 0) {
        const randomCard = unrevealedCards[Math.floor(Math.random() * unrevealedCards.length)];
        const guess = computerGuess(gameState, nextPlayer, randomCard.index);
        
        // guessがnullの場合は、ランダムな予想を行う
        const fallbackGuess = {
          suit: ['hearts', 'diamonds', 'clubs', 'spades'][Math.floor(Math.random() * 4)],
          number: Math.floor(Math.random() * 13) + 1
        };
        const finalGuess = guess || fallbackGuess;

        const targetCard = nextPlayer.cards[randomCard.index];
        const isCorrect = targetCard.number === finalGuess.number && targetCard.suit === finalGuess.suit;

        const updatedPlayers = [...gameState.players];
        const updatedLogs = addLog(
          updatedPlayers,
          randomCard.index,
          finalGuess.suit,
          finalGuess.number,
          isCorrect
        );

        if (isCorrect) {
          updatedPlayers[nextTargetIndex].cards[randomCard.index].isRevealed = true;
          
          // コンピュータープレイヤーの決定
          const willContinue = decideToContinue(currentPlayer, gameState);
          
          // コンピュータの行動を記録
          setComputerAction({
            player: currentPlayer.name,
            targetPlayer: nextPlayer.name,
            cardIndex: randomCard.index,
            guessedCard: finalGuess,
            isCorrect: isCorrect,
            updatedPlayers: updatedPlayers,
            nextPlayerIndex: willContinue ? gameState.currentPlayerIndex : getNextPlayerIndex(gameState.currentPlayerIndex),
            willContinue: willContinue
          });
          setShowComputerActionDialog(true);
        } else {
          const unrevealedOwnCards = currentPlayer.cards
            .map((card, index) => ({ card, index }))
            .filter(item => !item.card.isRevealed);

          if (unrevealedOwnCards.length > 0) {
            const randomOwnCard = unrevealedOwnCards[Math.floor(Math.random() * unrevealedOwnCards.length)];
            updatedPlayers[gameState.currentPlayerIndex].cards[randomOwnCard.index].isRevealed = true;
          }
          
          // 不正解の場合は必ず次のプレイヤーに移動
          setComputerAction({
            player: currentPlayer.name,
            targetPlayer: nextPlayer.name,
            cardIndex: randomCard.index,
            guessedCard: finalGuess,
            isCorrect: isCorrect,
            updatedPlayers: updatedPlayers,
            nextPlayerIndex: getNextPlayerIndex(gameState.currentPlayerIndex),
            willContinue: false
          });
          setShowComputerActionDialog(true);
        }

        // ゲーム状態の更新
        setGameState(prev => ({
          ...prev,
          logs: updatedLogs
        }));
      } else {
        // 予想できるカードがない場合は次のプレイヤーへ
        setGameState(prev => ({
          ...prev,
          currentPlayerIndex: getNextPlayerIndex(prev.currentPlayerIndex)
        }));
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [gameState, showComputerActionDialog]);  // showComputerActionDialogを依存配列に追加

  const handleDragStop = (e: any, data: { x: number; y: number }) => {
    setDialogPosition({ x: data.x, y: data.y });
  };

  // ゲームログを表示するコンポーネントを更新
  const GameLogs = () => (
    <div className="game-logs">
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
          </div>
        ))}
      </div>
    </div>
  );

  // コンピュータのアクション表示ダイアログ
  const ComputerActionDialog = () => {
    if (!computerAction || !showComputerActionDialog) return null;

    const handleContinue = () => {
      setGameState(prev => ({
        ...prev,
        players: computerAction.updatedPlayers,
        currentPlayerIndex: computerAction.nextPlayerIndex
      }));
      setShowComputerActionDialog(false);
      checkGameEnd(computerAction.updatedPlayers);
    };

    // キーボードイベントのハンドラーを追加
    useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
        // スペースキー、エンターキー、右矢印キーで次へ進む
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
          e.preventDefault();  // デフォルトの動作を防ぐ
          handleContinue();
        }
      };

      // イベントリスナーを追加
      window.addEventListener('keydown', handleKeyPress);

      // クリーンアップ関数
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }, [computerAction]);  // computerActionが変更されたときにリスナーを更新

    return (
      <Draggable handle=".dialog-header">
        <div className="guess-dialog computer-action-dialog">
          <div className="dialog-header">
            <h3>コンピューターの行動</h3>
            <div className="drag-handle">⋮⋮</div>
          </div>
          <div className="computer-action-content">
            <div className="action-description">
              <span className="player-name">{computerAction.player}</span>が
              <span className="player-name">{computerAction.targetPlayer}</span>の
              {computerAction.cardIndex + 1}枚目のカードを
            </div>
            <div className="action-guess">
              {getDisplayCard(computerAction.guessedCard.suit, computerAction.guessedCard.number)}と予想
              <span className="result-symbol">{computerAction.isCorrect ? '○' : '×'}</span>
            </div>
            {computerAction.isCorrect && (
              <div className="computer-decision">
                <span className="decision-text">
                  {computerAction.willContinue ? '続けて予想します' : '次のプレイヤーに回します'}
                </span>
              </div>
            )}
          </div>
          <button 
            className="action-continue-button"
            onClick={handleContinue}
          >
            次へ進む (Space / Enter / →)
          </button>
        </div>
      </Draggable>
    );
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
    
    // 脱落順を逆順にして順位を設定（最後に脱落 = 2位、最初に脱落 = 4位）
    const eliminationOrder = [...gameState.eliminationOrder];
    const reversedElimination = eliminationOrder.reverse();
    
    // 脱落順の逆順で順位を設定
    reversedElimination.forEach((playerId, index) => {
      if (playerId !== gameState.winner?.id) {  // 勝者は既に1位が設定されているのでスキップ
        ranks.set(playerId, index + 2);  // 2位から開始
      }
    });

    // デバッグ用のログ出力
    console.log('Winner:', gameState.winner?.name);
    console.log('Elimination Order:', gameState.eliminationOrder.map(id => 
      gameState.players.find(p => p.id === id)?.name
    ));
    console.log('Ranks:', Array.from(ranks.entries()).map(([id, rank]) => 
      `${gameState.players.find(p => p.id === id)?.name}: ${rank}位`
    ));

    return ranks;
  };

  // 統計情報を表示するコンポーネント
  const PlayerStats = ({ player }: { player: Player }) => {
    const stats = calculatePlayerStats(player.name);
    const ranks = calculatePlayerRanks();
    const rank = ranks.get(player.id);
    
    return (
      <div className="player-stats">
        <h3>
          {player.name}
          <span className={`player-rank ${rank === 1 ? 'first' : ''}`}>
            {rank}位{rank === 1 && ' 👑'}
          </span>
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

  return (
    <div className="game-container">
      <div className="game-main">
        <h1>カードハンター</h1>
        
        {gameState.gameStatus === 'waiting' ? (
          <div className="setup-container">
            <div className="game-rules">
              <h2>ゲームのルール</h2>
              <div className="rules-content">
                <h3>ゲームの目的</h3>
                <p>最後まで自分のカードを守り抜いた人が勝者となります！</p>
                
                <h3>基本ルール</h3>
                <ol>
                  <li>各プレイヤーは13枚のカードを持ちます（数字順に並びます）</li>
                  <li>順番に他のプレイヤーのカードを予想していきます</li>
                  <li>予想が当たった場合：
                    <ul>
                      <li>相手のカードが表向きになります</li>
                      <li>続けて次の予想ができます</li>
                    </ul>
                  </li>
                  <li>予想が外れた場合：
                    <ul>
                      <li>自分のカードを1枚表向きにしなければなりません</li>
                      <li>次のプレイヤーの番になります</li>
                    </ul>
                  </li>
                </ol>

                <h3>ゲーム終了</h3>
                <p>最後まで裏向きのカードを持っているプレイヤーが勝利します！</p>
              </div>
            </div>

            <div className="player-input">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="あなたの名前を入力"
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
                {playerName || 'プレイヤー1'} (あなた)
              </div>
              {[1, 2, 3].map(id => (
                <div key={id} className="player-item">
                  Computer {id} ({computerSettings[id].skillLevel === 'beginner' ? '初級' : 
                               computerSettings[id].skillLevel === 'intermediate' ? '中級' : '上級'})
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

            <div className="game-stats">
              {gameState.players.map((player) => (
                <PlayerStats key={player.id} player={player} />
              ))}
            </div>

            <div className="game-end-container">
              <div className="game-end-main">
                <div className="game-board">
                  {gameState.players.map((player, playerIndex) => (
                    <div key={player.id} className="player-section">
                      <h2>
                        {player.name}
                        {player.id === gameState.winner?.id && ' 👑'}
                      </h2>
                      <div className="player-cards">
                        {player.cards.map((card, cardIndex) => (
                          <Card
                            key={cardIndex}
                            card={card}
                            isHidden={false}
                            isSelected={false}
                            onClick={() => {}}
                            index={cardIndex}
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
                <h2 className={playerIndex === gameState.currentPlayerIndex ? 'current-player' : ''}>
                  {player.name}
                  {playerIndex === gameState.currentPlayerIndex ? ' (現在のプレイヤー)' : ''}
                  {playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex) && ' (予想対象)'}
                  {isSelectingOwnCard && playerIndex === gameState.currentPlayerIndex && 
                    ' - 表にするカードを選んでください'}
                </h2>
                <div className="player-cards">
                  {player.cards.map((card, cardIndex) => (
                    <Card
                      key={cardIndex}
                      card={card}
                      isHidden={playerIndex !== 0 && !card.isRevealed}
                      isSelected={
                        selectedCard?.playerIndex === playerIndex &&
                        selectedCard?.cardIndex === cardIndex
                      }
                      onClick={() => handleCardSelect(playerIndex, cardIndex)}
                      index={cardIndex}
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
                <div className="guess-dialog">
                  <div className="dialog-header">
                    <h3>カードのスートを予想してください</h3>
                    <div className="drag-handle">⋮⋮</div>
                  </div>
                  <div className="guess-buttons">
                    {['hearts', 'diamonds', 'clubs', 'spades'].map((suit) => (
                      <button
                        key={suit}
                        onClick={() => handleSuitSelect(suit as CardType['suit'])}
                        className={`suit-button ${suit}`}
                      >
                        {suitSymbols[suit]}
                      </button>
                    ))}
                  </div>
                  <button className="cancel-button" onClick={handleCancelSelection}>
                    キャンセル
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
                <div className="guess-dialog">
                  <div className="dialog-header">
                    <h3>カードの数字を予想してください</h3>
                    <div className="drag-handle">⋮⋮</div>
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
                      戻る
                    </button>
                    <button className="cancel-button" onClick={handleCancelSelection}>
                      キャンセル
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
