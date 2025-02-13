import { runAISimulation } from './aiTest';

// テスト実行用の関数
export const runTest = async () => {
  console.log('AI シミュレーションを開始します...');
  const startTime = performance.now();
  
  await runAISimulation(1);  // 100から1に減らす
  
  const endTime = performance.now();
  const executionTime = ((endTime - startTime) / 1000).toFixed(2);
  console.log(`\n実行時間: ${executionTime}秒`);
}; 