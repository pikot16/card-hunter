import React, { useState, useEffect } from 'react'
import Draggable, { DraggableCore } from 'react-draggable'
import './App.css'
import { GameState, Player, Card as CardType, GameLog } from './types/game'
import { shuffleCards, getDisplayNumber, computerGuess } from './utils/cardUtils'
import { playCorrectSound, playIncorrectSound } from './utils/soundUtils'
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

  // handleGuessの修正
  const handleGuess = (guessedNumber: number) => {
    if (!selectedCard || !selectedSuit) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const targetPlayer = gameState.players[selectedCard.playerIndex];
    const targetCard = targetPlayer.cards[selectedCard.cardIndex];
    
    const updatedPlayers = [...gameState.players];
    const isCorrect = targetCard.number === guessedNumber && targetCard.suit === selectedSuit;

    // ログを追加（正解時は willContinue を設定しない）
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
      
      const targetPlayerAllRevealed = updatedPlayers[selectedCard.playerIndex].cards.every(card => card.isRevealed);
      
      const survivingPlayers = updatedPlayers.filter(player => 
        !player.cards.every(card => card.isRevealed)
      );

      if (targetPlayerAllRevealed) {
        const updatedEliminationOrder = [...gameState.eliminationOrder];
        if (!updatedEliminationOrder.includes(targetPlayer.id)) {
          updatedEliminationOrder.push(targetPlayer.id);
        }

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
      
      // ゲーム終了条件を満たしていない場合のみ続行ダイアログを表示
      if (survivingPlayers.length > 1) {
        setCorrectGuessPlayers(updatedPlayers);
        setShowContinueDialog(true);
      }
      
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        logs: updatedLogs,
        eliminationOrder: targetPlayerAllRevealed ? 
          [...prev.eliminationOrder, targetPlayer.id] : 
          prev.eliminationOrder
      }));
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

  // handleContinueChoiceの修正
  const handleContinueChoice = (shouldContinue: boolean) => {
    // 選択後にログを更新
    setGameState(prev => ({
      ...prev,
      logs: prev.logs.map((log, index) => 
        index === prev.logs.length - 1 ? 
        { ...log, willContinue: shouldContinue } : 
        log
      ),
      players: correctGuessPlayers,
      currentPlayerIndex: shouldContinue ? prev.currentPlayerIndex : getNextPlayerIndex(prev.currentPlayerIndex)
    }));

    setShowContinueDialog(false);
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
    if (playerName.length > 10) {
      alert('プレイヤー名は10文字以内で入力してください。');
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
        // 選択したカードを設定
        setSelectedCard({ playerIndex: nextTargetIndex, cardIndex: randomCard.index });

        const guess = computerGuess(gameState, nextPlayer, randomCard.index);
        
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

        const targetCard = nextPlayer.cards[randomCard.index];
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
            isCorrect,
            updatedPlayers,
            nextPlayerIndex: willContinue ? gameState.currentPlayerIndex : getNextPlayerIndex(gameState.currentPlayerIndex),
            willContinue
          });

          // ゲーム状態の更新
          setGameState(prev => ({
            ...prev,
            logs: updatedLogs,
            players: updatedPlayers
          }));

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
              cardIndex: randomCard.index,
              revealedCardIndex: randomOwnCard.index,
              revealedPlayerIndex: gameState.currentPlayerIndex
            });
          }
          
          // 不正解の場合は必ず次のプレイヤーに移動
          setComputerAction({
            player: currentPlayer.name,
            targetPlayer: nextPlayer.name,
            cardIndex: randomCard.index,
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
        {showComputerActionDialog && ' (Space / Enter で次へ)'}
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
            {log.isCorrect && (
              (log.willContinue !== undefined || (showComputerActionDialog && computerAction?.isCorrect)) && (
                <div className="log-content continuation-status">
                  → {(() => {
                    // 最後の1人になった時のみゲーム終了を表示
                    const survivingPlayers = gameState.players.filter(p => 
                      !p.cards.every(card => card.isRevealed)
                    );
                    if (survivingPlayers.length === 1) {
                      return 'ゲーム終了';
                    }
                    // 通常の場合
                    return (log.willContinue !== undefined ? log.willContinue : computerAction?.willContinue) ? 
                      '続けて予想' : '次のプレイヤーに交代';
                  })()}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // コンピュータのアクション表示ダイアログ
  const ComputerActionDialog = () => {
    if (!computerAction || !showComputerActionDialog) return null;

    const handleContinue = () => {
      // コンピューターの行動完了時にログを更新
      setGameState(prev => ({
        ...prev,
        logs: prev.logs.map((log, index) => 
          index === prev.logs.length - 1 ? { ...log, willContinue: computerAction.willContinue } : log
        ),
        players: computerAction.updatedPlayers,
        currentPlayerIndex: computerAction.nextPlayerIndex
      }));
      setShowComputerActionDialog(false);
      setSelectedCard(null);  // 選択状態をリセット
      checkGameEnd(computerAction.updatedPlayers);
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
    
    // 脱落順から順位を設定（最初に脱落 = 4位、次に脱落 = 3位、最後に脱落 = 2位）
    const eliminationOrder = gameState.eliminationOrder;
    let currentRank = 4;
    
    eliminationOrder.forEach(playerId => {
      if (!ranks.has(playerId)) {
        ranks.set(playerId, currentRank--);
      }
    });

    return ranks;
  };

  // 統計情報を表示するコンポーネント
  const PlayerStats = ({ player }: { player: Player }) => {
    const stats = calculatePlayerStats(player.name);
    const ranks = calculatePlayerRanks();
    const rank = ranks.get(player.id);

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
          {rank}位{rank === 1 && ' 👑'}
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

  // ダイアログが表示された時にフォーカスを設定
  useEffect(() => {
    if (showSuitDialog && dialogRef) {
      dialogRef.focus();
    }
  }, [showSuitDialog, dialogRef]);

  // キーボードイベントハンドラーを追加
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSuitDialog) {
        // スートのショートカット
        if (e.key.toLowerCase() === 'h') {
          handleSuitSelect('hearts');
        } else if (e.key.toLowerCase() === 'd') {
          handleSuitSelect('diamonds');
        } else if (e.key.toLowerCase() === 'c') {
          handleSuitSelect('clubs');
        } else if (e.key.toLowerCase() === 's') {
          handleSuitSelect('spades');
        } else if (e.key === 'Escape') {
          handleCancelSelection();
        }
      } else if (showNumberDialog) {
        const numberMap: { [key: string]: number } = {
          'a': 1, '1': 1,
          '2': 2, '3': 3, '4': 4, '5': 5,
          '6': 6, '7': 7, '8': 8, '9': 9,
          '0': 10,
          'j': 11, 'q': 12, 'k': 13
        };
        
        if (e.key.toLowerCase() in numberMap) {
          handleGuess(numberMap[e.key.toLowerCase()]);
        } else if (e.key === 'Escape') {
          handleCancelSelection();
        } else if (e.key === 'Backspace') {
          handleBackToSuit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSuitDialog, showNumberDialog, selectedSuit]);

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
                <p>自分のカードを守り抜き、最後まで残ったプレイヤーが勝者となります！</p>
                
                <h3>ゲームの進め方</h3>
                <ol>
                  <li>各プレイヤーは13枚のトランプカードを配られます（Jokerは無し）
                    <ul>
                      <li>カードは数字順に並んでいます</li>
                      <li>自分のカードは見ることができますが、他のプレイヤーのカードは裏向きです</li>
                    </ul>
                  </li>
                  <li>プレイヤー1から順番に次のプレイヤーのカードを予想します
                    <ul>
                      <li>予想するカードを選び、そのカードの「スート（マーク）」と「数字」の両方を当てます</li>
                      <li>例：6番目のカードを「ハート（♥）の7」と予想</li>
                    </ul>
                  </li>
                  <li>予想が当たった場合：
                    <ul>
                      <li>予想した相手のカードが表向きになります</li>
                      <li>続けて相手のカードを予想するか、次のプレイヤーにターンを回すかを選択できます</li>
                    </ul>
                  </li>
                  <li>予想が外れた場合：
                    <ul>
                      <li>裏になっている自分のカードから1枚選んで表向きにしなければなりません</li>
                      <li>その後、次のプレイヤーのターンになります</li>
                    </ul>
                  </li>
                </ol>

                <h3>ゲーム終了と順位</h3>
                <ul>
                  <li>全てのカードが表向きになったプレイヤーから順に脱落となります</li>
                  <li>最後まで裏向きのカードを持っているプレイヤーが1位となります</li>
                </ul>
              </div>
            </div>

            <div className="player-input">
              <label htmlFor="player-name">あなたの名前 (10文字以内)</label>
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
                {playerName || 'プレイヤー1'} (あなた)
              </div>
              {[1, 2, 3].map(id => (
                <div key={id} className="player-item">
                  Computer {id} ({computerSettings[id].skillLevel === 'beginner' ? '初級' : 
                               computerSettings[id].skillLevel === 'intermediate' ? '中級' : '上級'} / {
                               computerSettings[id].personalityType === 'aggressive' ? '積極的' :
                                computerSettings[id].personalityType === 'cautious' ? '慎重' : 'バランス型'})
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
                            isSelected={
                              selectedCard?.playerIndex === playerIndex &&
                              selectedCard?.cardIndex === cardIndex ||
                              (selectedCard?.revealedPlayerIndex === playerIndex &&
                               selectedCard?.revealedCardIndex === cardIndex)
                            }
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
                      {log.isCorrect && log.willContinue !== undefined && (
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
                <h2 className={`${playerIndex === gameState.currentPlayerIndex ? 'current-player' : ''} ${!isSelectingOwnCard && playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex) ? 'target-player' : ''}`}>
                  {player.name}
                  {playerIndex === gameState.currentPlayerIndex ? ' (現在のプレイヤー) ' : ''}
                  {!isSelectingOwnCard && playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex) && 
                    (gameState.currentPlayerIndex === 0 && !selectedCard && !showContinueDialog && !showSuitDialog && !showNumberDialog ? 
                      ' (予想対象) - 予想するカードを選んでください' : 
                      ' (予想対象)'
                    )}
                  {isSelectingOwnCard && playerIndex === gameState.currentPlayerIndex && 
                    <span className="incorrect-message"> - 不正解... 表にするカードを選んでください</span>}
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
                >
                  <div className="dialog-header">
                    <h3>カードのスートを予想してください</h3>
                    <div className="drag-handle">⋮⋮</div>
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
                >
                  <div className="dialog-header">
                    <h3>カードの数字を予想してください</h3>
                    <div className="help-icon">
                      ℹ️
                      <div className="tooltip">
                        <ul>
                          <li>A <span className="key">A</span> or <span className="key">1</span></li>
                          <li>2-9 <span className="key">2</span>-<span className="key">9</span></li>
                          <li>10 <span className="key">0</span></li>
                          <li>J <span className="key">J</span></li>
                          <li>Q <span className="key">Q</span></li>
                          <li>K <span className="key">K</span></li>
                          <li>戻る <span className="key">Backspace</span></li>
                          <li>キャンセル <span className="key">Esc</span></li>
                        </ul>
                      </div>
                    </div>
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
