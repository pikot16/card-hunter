import React from 'react';
import { GameLog } from '../../types/game';

interface GameLogsProps {
  logs: GameLog[];
}

export const GameLogs: React.FC<GameLogsProps> = ({ logs }) => {
  const suitSymbols: { [key: string]: string } = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  };

  const getDisplayNumber = (num: number): string => {
    switch (num) {
      case 1: return 'A';
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      default: return num.toString();
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="game-logs">
      <h3>ゲームログ</h3>
      <div className="logs-container">
        {logs.length === 0 ? (
          <p className="no-logs">ゲームログはまだありません</p>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`log-entry ${log.isCorrect ? 'correct' : 'incorrect'}`}
            >
              <div className="log-time">{formatTime(log.timestamp)}</div>
              <div className="log-content">
                <div className="log-players">
                  <span className="player-name">{log.guessingPlayer}</span>
                  →
                  <span className="target-name">{log.targetPlayer}</span>
                </div>
                <div className="log-action">
                  <span className="card-index">{log.cardIndex + 1}番目</span>
                  のカードを
                  <span className={`card-guess ${log.guessedSuit}`}>
                    {suitSymbols[log.guessedSuit]}
                    {getDisplayNumber(log.guessedNumber)}
                  </span>
                  と予想
                  <span className={`result-icon ${log.isCorrect ? 'correct' : 'incorrect'}`}>
                    {log.isCorrect ? '○' : '×'}
                  </span>
                </div>
                {log.isCorrect && log.willContinue && (
                  <div className="continue-indicator">続けて予想</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}; 