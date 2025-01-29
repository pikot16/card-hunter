import React, { useState, useEffect } from 'react'
import Draggable, { DraggableCore } from 'react-draggable'
import './App.css'
import { GameState, Player, Card as CardType, GameLog } from './types/game'
import { shuffleCards, getDisplayNumber, computerGuess } from './utils/cardUtils'
import Card from './components/Card'

function App() {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    gameStatus: 'waiting',
    winner: null,
    logs: []
  });

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
  } | null>(null);

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

  // ゲーム終了の判定
  const checkGameEnd = (players: Player[]) => {
    const playersWithUnrevealedCards = players.filter(player =>
      player.cards.some(card => !card.isRevealed)
    );

    if (playersWithUnrevealedCards.length === 1) {
      const winner = playersWithUnrevealedCards[0];
      setGameState(prev => ({
        ...prev,
        gameStatus: 'finished',
        winner: winner,
        players,
        currentPlayerIndex: prev.currentPlayerIndex,
        logs: prev.logs
      }));
      alert(`${winner.name}の勝利！`);
    }
  };

  // ターン終了時の処理を更新
  const endTurn = (updatedPlayers: Player[]) => {
    const nextIndex = getNextPlayerIndex(gameState.currentPlayerIndex);
    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      currentPlayerIndex: nextIndex
    }));
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
      alert('正解！相手のカードを表にします。');
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        currentPlayerIndex: getNextPlayerIndex(prev.currentPlayerIndex),
        logs: updatedLogs
      }));
    } else {
      alert('不正解... 自分のカードを1枚クリックして表にしてください。');
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

  const handleOwnCardSelect = (cardIndex: number) => {
    const updatedPlayers = [...gameState.players];
    updatedPlayers[gameState.currentPlayerIndex].cards[cardIndex].isRevealed = true;
    
    endTurn(updatedPlayers);
  };

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
        cards: shuffledCards.slice(cardsPerPlayer, cardsPerPlayer * 2).sort((a, b) => a.number - b.number)
      },
      {
        id: 2,
        name: 'Computer 2',
        isComputer: true,
        cards: shuffledCards.slice(cardsPerPlayer * 2, cardsPerPlayer * 3).sort((a, b) => a.number - b.number)
      },
      {
        id: 3,
        name: 'Computer 3',
        isComputer: true,
        cards: shuffledCards.slice(cardsPerPlayer * 3, cardsPerPlayer * 4).sort((a, b) => a.number - b.number)
      }
    ];

    setGameState({
      players,
      currentPlayerIndex: 0,
      gameStatus: 'playing',
      winner: null,
      logs: []
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
      const nextPlayer = gameState.players[nextTargetIndex];
      
      // 表になっていないカードのインデックスを取得
      const unrevealedCards = nextPlayer.cards
        .map((card, index) => ({ card, index }))
        .filter(item => !item.card.isRevealed);
      
      if (unrevealedCards.length > 0) {
        const randomCard = unrevealedCards[Math.floor(Math.random() * unrevealedCards.length)];
        const guess = computerGuess(gameState, nextPlayer, randomCard.index);
        if (!guess) return;

        const targetCard = nextPlayer.cards[randomCard.index];
        const isCorrect = targetCard.number === guess.number && targetCard.suit === guess.suit;

        // コンピュータの行動を記録
        setComputerAction({
          player: currentPlayer.name,
          targetPlayer: nextPlayer.name,
          cardIndex: randomCard.index,
          guessedCard: { suit: guess.suit, number: guess.number },
          isCorrect: isCorrect,
          updatedPlayers: [...gameState.players].map(player => ({...player})),  // ディープコピー
          nextPlayerIndex: getNextPlayerIndex(gameState.currentPlayerIndex)
        });
        setShowComputerActionDialog(true);

        const updatedPlayers = [...gameState.players];
        const updatedLogs = addLog(
          updatedPlayers,
          randomCard.index,
          guess.suit,
          guess.number,
          isCorrect
        );

        if (isCorrect) {
          updatedPlayers[nextTargetIndex].cards[randomCard.index].isRevealed = true;
        } else {
          const unrevealedCards = currentPlayer.cards
            .map((card, index) => ({ card, index }))
            .filter(item => !item.card.isRevealed);

          if (unrevealedCards.length > 0) {
            const randomCard = unrevealedCards[Math.floor(Math.random() * unrevealedCards.length)];
            updatedPlayers[gameState.currentPlayerIndex].cards[randomCard.index].isRevealed = true;
          }
        }

        // ゲーム状態の更新を次へ進むボタンのクリック時に行うため、ここでは更新しない
        setGameState(prev => ({
          ...prev,
          logs: updatedLogs
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
      // ダイアログを閉じる前にゲーム状態を更新
      setGameState(prev => ({
        ...prev,
        players: computerAction.updatedPlayers,
        currentPlayerIndex: computerAction.nextPlayerIndex
      }));
      setShowComputerActionDialog(false);
      checkGameEnd(computerAction.updatedPlayers);
    };

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
          </div>
          <button 
            className="action-continue-button"
            onClick={handleContinue}
          >
            次へ進む
          </button>
        </div>
      </Draggable>
    );
  };

  return (
    <div className="game-container">
      <div className="game-main">
        <h1>カードハンター</h1>
        
        {gameState.gameStatus === 'waiting' ? (
          <div className="setup-container">
            <div className="player-input">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="あなたの名前を入力"
              />
              <button onClick={startGame}>ゲームを開始</button>
            </div>
            
            <div className="players-list">
              <h2>参加プレイヤー:</h2>
              {gameState.players.map(player => (
                <div key={player.id} className="player-item">
                  {player.name} {player.isComputer ? '(コンピューター)' : ''}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="game-board">
            {gameState.players.map((player, playerIndex) => (
              <div key={player.id} className="player-section">
                <h2 className={playerIndex === gameState.currentPlayerIndex ? 'current-player' : ''}>
                  {player.name}
                  {playerIndex === gameState.currentPlayerIndex ? ' (現在のプレイヤー)' : ''}
                  {playerIndex === getNextTargetPlayerIndex(gameState.currentPlayerIndex) && 
                    gameState.currentPlayerIndex === 0 && ' (予想対象)'}
                  {isSelectingOwnCard && playerIndex === gameState.currentPlayerIndex && 
                    ' - 表にするカードを選んでください'}
                </h2>
                <div className="player-cards">
                  {player.cards.map((card, cardIndex) => (
                    <Card
                      key={cardIndex}
                      card={card}
                      isHidden={playerIndex !== 0}
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
      
      {gameState.gameStatus === 'playing' && <GameLogs />}
    </div>
  )
}

export default App
