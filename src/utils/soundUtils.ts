// 効果音の管理と再生を行うユーティリティ

// 音声インスタンスをキャッシュ
const audioCache: { [key: string]: HTMLAudioElement } = {
  correct: new Audio('./sounds/correct.mp3'),
  incorrect: new Audio('./sounds/incorrect.mp3'),
};

// 音量を30%に設定
Object.values(audioCache).forEach(audio => {
  audio.volume = 0.3;
});

// 正解音を再生
export const playCorrectSound = () => {
  audioCache.correct.currentTime = 0;
  audioCache.correct.play().catch(error => {
    console.error('Failed to play correct sound:', error);
  });
};

// 不正解音を再生
export const playIncorrectSound = () => {
  audioCache.incorrect.currentTime = 0;
  audioCache.incorrect.play().catch(error => {
    console.error('Failed to play incorrect sound:', error);
  });
}; 