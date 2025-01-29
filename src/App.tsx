import React, { useState, useEffect } from 'react'
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
  const [showOwnCardSelection, setShowOwnCardSelection] = useState(false);

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
      alert('不正解... 自分のカードを1枚選んで表にしてください。');
      if (currentPlayer.isComputer) {
        // 表になっていないカードの中からランダムに1枚選ぶ
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
        setShowOwnCardSelection(true);
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
    setShowOwnCardSelection(false);
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

    const timeoutId = setTimeout(() => {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const nextTargetIndex = getNextTargetPlayerIndex(gameState.currentPlayerIndex);
      const nextPlayer = gameState.players[nextTargetIndex];
      
      const guess = computerGuess(nextPlayer);
      if (!guess) return;

      const unrevealedCards = nextPlayer.cards
        .map((card, index) => ({ card, index }))
        .filter(item => !item.card.isRevealed);
      
      if (unrevealedCards.length > 0) {
        const randomCard = unrevealedCards[Math.floor(Math.random() * unrevealedCards.length)];
        const targetCard = nextPlayer.cards[randomCard.index];
        const isCorrect = targetCard.number === guess.number && targetCard.suit === guess.suit;
        
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
          // 表になっていないカードの中からランダムに1枚選ぶ
          const unrevealedCards = currentPlayer.cards
            .map((card, index) => ({ card, index }))
            .filter(item => !item.card.isRevealed);

          if (unrevealedCards.length > 0) {
            const randomCard = unrevealedCards[Math.floor(Math.random() * unrevealedCards.length)];
            updatedPlayers[gameState.currentPlayerIndex].cards[randomCard.index].isRevealed = true;
          }
        }

        setGameState(prev => ({
          ...prev,
          players: updatedPlayers,
          currentPlayerIndex: getNextPlayerIndex(prev.currentPlayerIndex),
          logs: updatedLogs
        }));
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [gameState]);

  // ゲームログを表示するコンポーネント
  const GameLogs = () => (
    <div className="game-logs">
      <h3>ゲーム履歴</h3>
      <div className="logs-container">
        {gameState.logs.slice().reverse().map((log, index) => (
          <div key={log.timestamp} className={`log-item ${log.isCorrect ? 'correct' : 'incorrect'}`}>
            {log.guessingPlayer}が{log.targetPlayer}の
            {log.cardIndex + 1}枚目のカードを
            {log.guessedSuit} {getDisplayNumber(log.guessedNumber)}と予想
            → {log.isCorrect ? '正解！' : '不正解'}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="game-container">
      <div className="game-main">
        <h1>カードミステリー</h1>
        
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
                    />
                  ))}
                </div>
              </div>
            ))}

            {showSuitDialog && (
              <div className="guess-dialog">
                <h3>カードのスートを予想してください</h3>
                <div className="guess-buttons">
                  {['hearts', 'diamonds', 'clubs', 'spades'].map((suit) => (
                    <button
                      key={suit}
                      onClick={() => handleSuitSelect(suit as CardType['suit'])}
                    >
                      {suit}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showNumberDialog && (
              <div className="guess-dialog">
                <h3>カードの数字を予想してください</h3>
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
              </div>
            )}

            {showOwnCardSelection && (
              <div className="guess-dialog">
                <h3>表にするカードを選んでください</h3>
                <div className="own-cards">
                  {gameState.players[gameState.currentPlayerIndex].cards
                    .map((card, index) => !card.isRevealed && (
                      <button
                        key={index}
                        className="card-button"
                        onClick={() => handleOwnCardSelect(index)}
                      >
                        {`${card.suit} ${getDisplayNumber(card.number)}`}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {gameState.gameStatus === 'playing' && <GameLogs />}
    </div>
  )
}

export default App
