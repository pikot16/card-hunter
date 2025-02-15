import React from 'react';
import { Player } from '../../types/game';

interface GameEndScreenProps {
  winner: Player;
  eliminationOrder: number[];
  players: Player[];
  onRestart: () => void;
}

export const GameEndScreen: React.FC<GameEndScreenProps> = ({
  winner,
  eliminationOrder,
  players,
  onRestart
}) => {
  const getPlacement = (playerId: number): string => {
    if (winner.id === playerId) return '優勝';
    const index = eliminationOrder.indexOf(playerId);
    if (index === -1) return '';
    return `${index + 2}位`;
  };

  return (
    <div className="game-end-screen">
      <div className="winner-section">
        <h2>ゲーム終了</h2>
        <div className="winner-info">
          <div className="winner-crown">👑</div>
          <h3>優勝: {winner.name}</h3>
        </div>
      </div>

      <div className="results-section">
        <h4>最終結果</h4>
        <div className="player-results">
          {players.map(player => (
            <div
              key={player.id}
              className={`result-entry ${player.id === winner.id ? 'winner' : ''}`}
            >
              <div className="placement">{getPlacement(player.id)}</div>
              <div className="player-info">
                <span className="player-name">{player.name}</span>
                <span className="player-type">
                  {player.isComputer ? (
                    <>
                      {player.skillLevel && (
                        <span className="skill-level">{player.skillLevel}</span>
                      )}
                      {player.personalityType && (
                        <span className="personality-type">{player.personalityType}</span>
                      )}
                    </>
                  ) : (
                    'プレイヤー'
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="restart-button" onClick={onRestart}>
        もう一度プレイ
      </button>
    </div>
  );
}; 