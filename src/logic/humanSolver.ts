import {
  DIGITS,
  EMPTY,
  GRID_SIZE,
  UNITS,
  boxOf,
  candidatesOf,
  colOf,
  isComplete,
  peersOf,
  rowOf,
  type Grid,
} from './board';

export type Technique =
  | 'nakedSingle'
  | 'hiddenSingle'
  | 'nakedPair'
  | 'hiddenPair'
  | 'pointing'
  | 'claiming'
  | 'nakedTriple'
  | 'hiddenTriple'
  | 'xWing'
  | 'xyWing';

/** 難易度ティア。1=イージー級、2=スタンダード級、3=ハード級。 */
export const TECHNIQUE_TIERS: Record<Technique, 1 | 2 | 3> = {
  nakedSingle: 1,
  hiddenSingle: 1,
  nakedPair: 2,
  hiddenPair: 2,
  pointing: 2,
  claiming: 2,
  nakedTriple: 3,
  hiddenTriple: 3,
  xWing: 3,
  xyWing: 3,
};

export interface SolverState {
  grid: Grid;
  /** 空マスの候補集合。埋まっているマスはnull。 */
  cands: (Set<number> | null)[];
}

export interface Elimination {
  cell: number;
  digit: number;
}

export type Move =
  | { technique: Technique; type: 'place'; cell: number; digit: number }
  | { technique: Technique; type: 'eliminate'; eliminations: Elimination[] };

export function createState(grid: Grid): SolverState {
  return {
    grid: [...grid],
    cands: grid.map((v, i) => (v === EMPTY ? new Set(candidatesOf(grid, i)) : null)),
  };
}

export function applyMove(state: SolverState, move: Move): void {
  if (move.type === 'place') {
    state.grid[move.cell] = move.digit;
    state.cands[move.cell] = null;
    for (const peer of peersOf(move.cell)) {
      state.cands[peer]?.delete(move.digit);
    }
  } else {
    for (const { cell, digit } of move.eliminations) {
      state.cands[cell]?.delete(digit);
    }
  }
}

export function findNakedSingle(state: SolverState): Move | null {
  for (let cell = 0; cell < state.cands.length; cell++) {
    const cands = state.cands[cell];
    if (cands?.size === 1) {
      return { technique: 'nakedSingle', type: 'place', cell, digit: [...cands][0] };
    }
  }
  return null;
}

/** ユニット内でdigitが候補になっているセルの一覧。 */
function positionsInUnit(state: SolverState, unit: readonly number[], digit: number): number[] {
  return unit.filter((cell) => state.cands[cell]?.has(digit));
}

export function findHiddenSingle(state: SolverState): Move | null {
  for (const unit of UNITS) {
    for (const digit of DIGITS) {
      const positions = positionsInUnit(state, unit, digit);
      if (positions.length === 1) {
        return { technique: 'hiddenSingle', type: 'place', cell: positions[0], digit };
      }
    }
  }
  return null;
}

function* combinations(n: number, k: number): Generator<number[]> {
  const indices = Array.from({ length: k }, (_, i) => i);
  for (;;) {
    yield [...indices];
    let i = k - 1;
    while (i >= 0 && indices[i] === n - k + i) i--;
    if (i < 0) return;
    indices[i]++;
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
  }
}

/** ユニット内のkセルの候補の和集合がk個の数字に収まるとき、他セルからそれらを除去する。 */
function findNakedSubset(state: SolverState, k: number, technique: Technique): Move | null {
  for (const unit of UNITS) {
    const emptyCells = unit.filter((cell) => state.cands[cell] !== null);
    if (emptyCells.length <= k) continue;
    for (const combo of combinations(emptyCells.length, k)) {
      const cells = combo.map((i) => emptyCells[i]);
      const union = new Set<number>();
      for (const cell of cells) {
        for (const d of state.cands[cell]!) union.add(d);
      }
      if (union.size !== k) continue;
      const eliminations: Elimination[] = [];
      for (const cell of emptyCells) {
        if (cells.includes(cell)) continue;
        for (const digit of union) {
          if (state.cands[cell]!.has(digit)) eliminations.push({ cell, digit });
        }
      }
      if (eliminations.length > 0) return { technique, type: 'eliminate', eliminations };
    }
  }
  return null;
}

/** ユニット内のk個の数字の置き場所の和集合がkセルに収まるとき、そのセルを当該数字に限定する。 */
function findHiddenSubset(state: SolverState, k: number, technique: Technique): Move | null {
  for (const unit of UNITS) {
    const digitPositions = DIGITS.map((digit) => positionsInUnit(state, unit, digit));
    const activeDigits = DIGITS.filter((d) => digitPositions[d - 1].length > 0);
    if (activeDigits.length <= k) continue;
    for (const combo of combinations(activeDigits.length, k)) {
      const digits = combo.map((i) => activeDigits[i]);
      const cellUnion = new Set<number>();
      for (const digit of digits) {
        for (const cell of digitPositions[digit - 1]) cellUnion.add(cell);
      }
      if (cellUnion.size !== k) continue;
      const eliminations: Elimination[] = [];
      for (const cell of cellUnion) {
        for (const digit of state.cands[cell]!) {
          if (!digits.includes(digit)) eliminations.push({ cell, digit });
        }
      }
      if (eliminations.length > 0) return { technique, type: 'eliminate', eliminations };
    }
  }
  return null;
}

export function findNakedPair(state: SolverState): Move | null {
  return findNakedSubset(state, 2, 'nakedPair');
}

export function findHiddenPair(state: SolverState): Move | null {
  return findHiddenSubset(state, 2, 'hiddenPair');
}

export function findNakedTriple(state: SolverState): Move | null {
  return findNakedSubset(state, 3, 'nakedTriple');
}

export function findHiddenTriple(state: SolverState): Move | null {
  return findHiddenSubset(state, 3, 'hiddenTriple');
}

/** ブロック内で1行(列)に限定された数字を、その行(列)のブロック外から除去する。 */
export function findPointing(state: SolverState): Move | null {
  for (let box = 0; box < GRID_SIZE; box++) {
    const unit = UNITS[GRID_SIZE * 2 + box];
    for (const digit of DIGITS) {
      const positions = positionsInUnit(state, unit, digit);
      if (positions.length < 2) continue;
      for (const [lineOf, cellsOfLine] of [
        [rowOf, (line: number) => UNITS[line]],
        [colOf, (line: number) => UNITS[GRID_SIZE + line]],
      ] as const) {
        const lines = new Set(positions.map(lineOf));
        if (lines.size !== 1) continue;
        const [line] = lines;
        const eliminations: Elimination[] = [];
        for (const cell of cellsOfLine(line)) {
          if (boxOf(cell) === box) continue;
          if (state.cands[cell]?.has(digit)) eliminations.push({ cell, digit });
        }
        if (eliminations.length > 0) {
          return { technique: 'pointing', type: 'eliminate', eliminations };
        }
      }
    }
  }
  return null;
}

/** 行(列)内で1ブロックに限定された数字を、そのブロックの他セルから除去する。 */
export function findClaiming(state: SolverState): Move | null {
  for (let line = 0; line < GRID_SIZE * 2; line++) {
    const unit = UNITS[line];
    for (const digit of DIGITS) {
      const positions = positionsInUnit(state, unit, digit);
      if (positions.length < 2) continue;
      const boxes = new Set(positions.map(boxOf));
      if (boxes.size !== 1) continue;
      const [box] = boxes;
      const eliminations: Elimination[] = [];
      for (const cell of UNITS[GRID_SIZE * 2 + box]) {
        if (unit.includes(cell)) continue;
        if (state.cands[cell]?.has(digit)) eliminations.push({ cell, digit });
      }
      if (eliminations.length > 0) {
        return { technique: 'claiming', type: 'eliminate', eliminations };
      }
    }
  }
  return null;
}

/** 2行(列)で同じ2列(行)に限定された数字を、その2列(行)の他行(列)から除去する。 */
export function findXWing(state: SolverState): Move | null {
  for (const isRows of [true, false]) {
    const primaryUnits = isRows ? UNITS.slice(0, GRID_SIZE) : UNITS.slice(GRID_SIZE, GRID_SIZE * 2);
    const crossUnits = isRows ? UNITS.slice(GRID_SIZE, GRID_SIZE * 2) : UNITS.slice(0, GRID_SIZE);
    const crossOf = isRows ? colOf : rowOf;
    const primaryOf = isRows ? rowOf : colOf;
    for (const digit of DIGITS) {
      const pairs: { key: string; crosses: number[]; unitIndex: number }[] = [];
      for (let u = 0; u < GRID_SIZE; u++) {
        const positions = positionsInUnit(state, primaryUnits[u], digit);
        if (positions.length !== 2) continue;
        const crosses = positions.map(crossOf);
        pairs.push({ key: crosses.join(','), crosses, unitIndex: u });
      }
      for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          if (pairs[i].key !== pairs[j].key) continue;
          const eliminations: Elimination[] = [];
          for (const cross of pairs[i].crosses) {
            for (const cell of crossUnits[cross]) {
              const primary = primaryOf(cell);
              if (primary === pairs[i].unitIndex || primary === pairs[j].unitIndex) continue;
              if (state.cands[cell]?.has(digit)) eliminations.push({ cell, digit });
            }
          }
          if (eliminations.length > 0) {
            return { technique: 'xWing', type: 'eliminate', eliminations };
          }
        }
      }
    }
  }
  return null;
}

/** ピボット{x,y}とピンサー{x,z},{y,z}から、両ピンサーが見える共通セルのzを除去する。 */
export function findXYWing(state: SolverState): Move | null {
  const bivalues: number[] = [];
  for (let cell = 0; cell < state.cands.length; cell++) {
    if (state.cands[cell]?.size === 2) bivalues.push(cell);
  }
  for (const pivot of bivalues) {
    const [x, y] = [...state.cands[pivot]!];
    const pivotPeers = peersOf(pivot);
    for (const a of pivotPeers) {
      const candsA = state.cands[a];
      if (candsA?.size !== 2) continue;
      for (const b of pivotPeers) {
        if (b <= a) continue;
        const candsB = state.cands[b];
        if (candsB?.size !== 2) continue;
        for (const [p, q] of [
          [x, y],
          [y, x],
        ]) {
          if (!candsA.has(p) || candsA.has(q)) continue;
          if (!candsB.has(q) || candsB.has(p)) continue;
          const [z] = [...candsA].filter((d) => d !== p);
          const [zb] = [...candsB].filter((d) => d !== q);
          if (z !== zb) continue;
          const peersA = new Set(peersOf(a));
          const eliminations: Elimination[] = [];
          for (const cell of peersOf(b)) {
            if (cell === pivot || cell === a) continue;
            if (peersA.has(cell) && state.cands[cell]?.has(z)) {
              eliminations.push({ cell, digit: z });
            }
          }
          if (eliminations.length > 0) {
            return { technique: 'xyWing', type: 'eliminate', eliminations };
          }
        }
      }
    }
  }
  return null;
}

const FINDERS: ((state: SolverState) => Move | null)[] = [
  findNakedSingle,
  findHiddenSingle,
  findNakedPair,
  findHiddenPair,
  findPointing,
  findClaiming,
  findNakedTriple,
  findHiddenTriple,
  findXWing,
  findXYWing,
];

export interface HumanSolveResult {
  solved: boolean;
  grid: Grid;
  usedTechniques: Set<Technique>;
  /** 使用したテクニックの最高ティア。テクニック不要なら0。 */
  highestTier: 0 | 1 | 2 | 3;
}

/** 人間的テクニックだけで解けるところまで解く。 */
export function humanSolve(grid: Grid): HumanSolveResult {
  const state = createState(grid);
  const used = new Set<Technique>();
  for (;;) {
    if (state.grid.every((v) => v !== EMPTY)) break;
    const move = FINDERS.reduce<Move | null>((found, find) => found ?? find(state), null);
    if (!move) break;
    used.add(move.technique);
    applyMove(state, move);
  }
  const highestTier = [...used].reduce<0 | 1 | 2 | 3>(
    (max, t) => (TECHNIQUE_TIERS[t] > max ? TECHNIQUE_TIERS[t] : max),
    0,
  );
  return { solved: isComplete(state.grid), grid: state.grid, usedTechniques: used, highestTier };
}
