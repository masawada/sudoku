import { CELL_COUNT, EMPTY, type Grid } from './board';
import { countSolutions, generateSolvedGrid } from './backtrack';
import { humanSolve } from './humanSolver';
import { shuffled, type Rng } from './rng';

export type Difficulty = 'easy' | 'standard' | 'hard';

export interface Puzzle {
  givens: Grid;
  solution: Grid;
  difficulty: Difficulty;
}

const TARGET_TIER: Record<Difficulty, 1 | 2 | 3> = {
  easy: 1,
  standard: 2,
  hard: 3,
};

/** 人間的テクニックで解けるなら難易度を、解けないならnullを返す。 */
export function rateDifficulty(grid: Grid): Difficulty | null {
  const result = humanSolve(grid);
  if (!result.solved) return null;
  if (result.highestTier <= 1) return 'easy';
  if (result.highestTier === 2) return 'standard';
  return 'hard';
}

/** 一意解を保てる限り穴をあける。掘れた(空にした)セルの一覧も返す。 */
function digMax(solution: Grid, rng: Rng): { grid: Grid; removed: number[] } {
  const grid = [...solution];
  const removed: number[] = [];
  const cells = shuffled(
    Array.from({ length: CELL_COUNT }, (_, i) => i),
    rng,
  );
  for (const cell of cells) {
    const backup = grid[cell];
    grid[cell] = EMPTY;
    if (countSolutions(grid, 2) === 1) {
      removed.push(cell);
    } else {
      grid[cell] = backup;
    }
  }
  return { grid, removed };
}

/**
 * 人間が解けない状態からヒントを戻し、目標tierちょうどで解ける状態を目指す。
 * 目標未満に着地してしまう復元は避けて別のセルを試す。成功でtrue。
 */
function steerToTier(
  grid: Grid,
  solution: Grid,
  removed: number[],
  target: number,
  rng: Rng,
): boolean {
  const first = humanSolve(grid);
  if (first.solved) return first.highestTier === target;
  const pool = shuffled(removed, rng);
  for (;;) {
    let progressed = false;
    for (let i = 0; i < pool.length; i++) {
      const cell = pool[i];
      grid[cell] = solution[cell];
      const result = humanSolve(grid);
      if (result.solved && result.highestTier === target) return true;
      if (result.solved) {
        grid[cell] = EMPTY;
        continue;
      }
      pool.splice(i, 1);
      progressed = true;
      break;
    }
    if (!progressed) return false;
  }
}

/** イージー用: singlesだけで解ける状態を保ちながら掘る。 */
function digEasy(solution: Grid, rng: Rng): Grid {
  const grid = [...solution];
  const cells = shuffled(
    Array.from({ length: CELL_COUNT }, (_, i) => i),
    rng,
  );
  for (const cell of cells) {
    const backup = grid[cell];
    grid[cell] = EMPTY;
    const keeps =
      countSolutions(grid, 2) === 1 &&
      (() => {
        const result = humanSolve(grid);
        return result.solved && result.highestTier <= 1;
      })();
    if (!keeps) grid[cell] = backup;
  }
  return grid;
}

const MAX_ATTEMPTS = 200;

/** 指定難易度のパズルを生成する。 */
export function generatePuzzle(difficulty: Difficulty, rng: Rng): Puzzle {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solution = generateSolvedGrid(rng);
    if (difficulty === 'easy') {
      const givens = digEasy(solution, rng);
      return { givens, solution, difficulty };
    }
    const { grid, removed } = digMax(solution, rng);
    if (steerToTier(grid, solution, removed, TARGET_TIER[difficulty], rng)) {
      return { givens: grid, solution, difficulty };
    }
  }
  throw new Error(`${difficulty}の問題生成に失敗しました(${MAX_ATTEMPTS}回試行)`);
}
