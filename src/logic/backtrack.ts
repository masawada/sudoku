import { CELL_COUNT, DIGITS, EMPTY, candidatesOf, findViolations, type Grid } from './board';
import { shuffled, type Rng } from './rng';

function findBestEmptyCell(grid: Grid): number {
  // 候補が最少の空マスを選ぶ(探索空間の削減)
  let best = -1;
  let bestCount = Infinity;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (grid[i] !== EMPTY) continue;
    const count = candidatesOf(grid, i).length;
    if (count < bestCount) {
      best = i;
      bestCount = count;
      if (count <= 1) break;
    }
  }
  return best;
}

/** 解の個数をlimitまで数える(一意性チェックはlimit=2で使う)。 */
export function countSolutions(grid: Grid, limit: number): number {
  if (findViolations(grid).size > 0) return 0;
  const work = [...grid];

  function search(): number {
    const cell = findBestEmptyCell(work);
    if (cell === -1) return 1;
    let count = 0;
    for (const digit of candidatesOf(work, cell)) {
      work[cell] = digit;
      count += search();
      work[cell] = EMPTY;
      if (count >= limit) break;
    }
    return count;
  }

  return Math.min(search(), limit);
}

/** 1つの解を返す。解けなければnull。digitOrderを渡すと探索順を制御できる。 */
export function solve(grid: Grid, digitOrder?: (cell: number) => readonly number[]): Grid | null {
  if (findViolations(grid).size > 0) return null;
  const work = [...grid];

  function search(): boolean {
    const cell = findBestEmptyCell(work);
    if (cell === -1) return true;
    const candidates = new Set(candidatesOf(work, cell));
    const order = digitOrder ? digitOrder(cell) : DIGITS;
    for (const digit of order) {
      if (!candidates.has(digit)) continue;
      work[cell] = digit;
      if (search()) return true;
      work[cell] = EMPTY;
    }
    return false;
  }

  return search() ? work : null;
}

/** ランダムな完成盤を生成する。 */
export function generateSolvedGrid(rng: Rng): Grid {
  const empty: Grid = new Array(CELL_COUNT).fill(EMPTY);
  const solution = solve(empty, () => shuffled(DIGITS, rng));
  if (!solution) throw new Error('完成盤の生成に失敗しました');
  return solution;
}
