import React from 'react';
import { Player, SkillLevel, PersonalityType } from '../../types/game';

interface GameSetupProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onComputerSettingsChange: (settings: {
    [key: string]: {
      skillLevel: SkillLevel;
      personalityType: PersonalityType;
    }
  }) => void;
  onStartGame: () => void;
}

export const GameSetup: React.FC<GameSetupProps> = ({
  playerName,
  onPlayerNameChange,
  onComputerSettingsChange,
  onStartGame
}) => {
  return (
    <div className="setup-container">
      <div className="game-rules">
        <h2>カードハンター</h2>
        <div className="rules-content">
          <h3>ゲームルール</h3>
          <p>各プレイヤーは13枚のカードを持ち、順番に他のプレイヤーのカードを当てていきます。</p>
          <ol>
            <li>自分の番が来たら、他のプレイヤーのカードを1枚選びます。</li>
            <li>選んだカードのスートと数字を予想します。</li>
            <li>予想が当たれば、そのカードは表向きになり、続けて予想できます。</li>
            <li>予想が外れたら、次のプレイヤーの番になります。</li>
          </ol>
          <p>全てのカードが表向きになったプレイヤーは脱落します。最後まで残ったプレイヤーが勝者です。</p>
        </div>
      </div>

      <div className="player-input">
        <label>
          プレイヤー名:
          <input
            type="text"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder="名前を入力してください"
            maxLength={20}
          />
        </label>
      </div>

      <button className="start-button" onClick={onStartGame}>
        ゲームを開始
      </button>
    </div>
  );
}; 