import type { Difficulty, Puzzle } from '../logic/generator';

/** Web Workerでパズルを生成する(UIスレッドをブロックしない)。 */
export function generatePuzzleAsync(difficulty: Difficulty): Promise<Puzzle> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./generatorWorker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<Puzzle>) => {
      resolve(event.data);
      worker.terminate();
    };
    worker.onerror = (event) => {
      reject(new Error(event.message));
      worker.terminate();
    };
    worker.postMessage({ difficulty, seed: Math.floor(Math.random() * 2 ** 32) });
  });
}
