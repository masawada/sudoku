import { generatePuzzle, type Difficulty } from '../logic/generator';
import { createRng } from '../logic/rng';

self.onmessage = (event: MessageEvent<{ difficulty: Difficulty; seed: number }>) => {
  const { difficulty, seed } = event.data;
  self.postMessage(generatePuzzle(difficulty, createRng(seed)));
};
