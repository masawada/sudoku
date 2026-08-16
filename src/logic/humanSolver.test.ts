import { describe, expect, it } from 'vitest';
import { EMPTY, parseGrid, type Grid } from './board';
import { countSolutions } from './backtrack';
import {
  TECHNIQUE_TIERS,
  applyMove,
  createState,
  findClaiming,
  findHiddenPair,
  findHiddenSingle,
  findHiddenTriple,
  findNakedPair,
  findNakedSingle,
  findNakedTriple,
  findPointing,
  findXWing,
  findXYWing,
  humanSolve,
} from './humanSolver';

const PUZZLE =
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

// 論理テクニックだけでは解けない超難問(Inkala 2012)。一意解は持つ。
const TOO_HARD =
  '8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..';

function emptyGrid(): Grid {
  return parseGrid('.'.repeat(81));
}

describe('TECHNIQUE_TIERS', () => {
  it('全テクニックが1-3のティアを持つ', () => {
    expect(TECHNIQUE_TIERS.nakedSingle).toBe(1);
    expect(TECHNIQUE_TIERS.hiddenSingle).toBe(1);
    expect(TECHNIQUE_TIERS.nakedPair).toBe(2);
    expect(TECHNIQUE_TIERS.hiddenPair).toBe(2);
    expect(TECHNIQUE_TIERS.pointing).toBe(2);
    expect(TECHNIQUE_TIERS.claiming).toBe(2);
    expect(TECHNIQUE_TIERS.nakedTriple).toBe(3);
    expect(TECHNIQUE_TIERS.hiddenTriple).toBe(3);
    expect(TECHNIQUE_TIERS.xWing).toBe(3);
    expect(TECHNIQUE_TIERS.xyWing).toBe(3);
  });
});

describe('findNakedSingle', () => {
  it('候補が1つだけのセルへの配置を返す', () => {
    const grid = parseGrid(SOLUTION);
    const target = grid[40];
    grid[40] = EMPTY;
    const state = createState(grid);
    const move = findNakedSingle(state);
    expect(move).toEqual({
      technique: 'nakedSingle',
      type: 'place',
      cell: 40,
      digit: target,
    });
  });

  it('該当がなければnullを返す', () => {
    expect(findNakedSingle(createState(emptyGrid()))).toBeNull();
  });
});

describe('findHiddenSingle', () => {
  it('ユニット内でその数字が置ける唯一のセルへの配置を返す', () => {
    // ブロック0で5が置けるのはセル0のみになるよう構成
    const grid = emptyGrid();
    grid[13] = 5; // r1c4: ブロック0の行1を塞ぐ
    grid[25] = 5; // r2c7: ブロック0の行2を塞ぐ
    grid[37] = 5; // r4c1: ブロック0の列1を塞ぐ
    grid[47] = 5; // r5c2: ブロック0の列2を塞ぐ
    const state = createState(grid);
    const move = findHiddenSingle(state);
    expect(move).toEqual({
      technique: 'hiddenSingle',
      type: 'place',
      cell: 0,
      digit: 5,
    });
  });

  it('該当がなければnullを返す', () => {
    expect(findHiddenSingle(createState(emptyGrid()))).toBeNull();
  });
});

describe('findNakedPair', () => {
  it('同一候補ペアの2セルがあれば他セルからその候補を除去する', () => {
    const state = createState(emptyGrid());
    state.cands[1] = new Set([2, 5]);
    state.cands[2] = new Set([2, 5]);
    const move = findNakedPair(state);
    expect(move?.technique).toBe('nakedPair');
    expect(move?.type).toBe('eliminate');
    if (move?.type !== 'eliminate') throw new Error('unreachable');
    // 行0の他セル(例: セル0)から2と5が除去される
    expect(move.eliminations).toContainEqual({ cell: 0, digit: 2 });
    expect(move.eliminations).toContainEqual({ cell: 0, digit: 5 });
    // ペア自身からは除去しない
    expect(move.eliminations.find((e) => e.cell === 1 || e.cell === 2)).toBeUndefined();
  });

  it('該当がなければnullを返す', () => {
    expect(findNakedPair(createState(emptyGrid()))).toBeNull();
  });
});

describe('findHiddenPair', () => {
  it('2つの数字が同じ2セルにしか置けないとき、その2セルを2数字に限定する', () => {
    const state = createState(emptyGrid());
    // 行0で3と7をセル4と8以外から除去
    for (const cell of [0, 1, 2, 3, 5, 6, 7]) {
      state.cands[cell]!.delete(3);
      state.cands[cell]!.delete(7);
    }
    const move = findHiddenPair(state);
    expect(move?.technique).toBe('hiddenPair');
    if (move?.type !== 'eliminate') throw new Error('unreachable');
    // セル4と8から3,7以外の候補が除去される
    expect(move.eliminations).toContainEqual({ cell: 4, digit: 1 });
    expect(move.eliminations).toContainEqual({ cell: 8, digit: 9 });
    expect(move.eliminations.find((e) => e.digit === 3 || e.digit === 7)).toBeUndefined();
  });
});

describe('findPointing', () => {
  it('ブロック内で1行に限定された数字を、その行のブロック外から除去する', () => {
    const state = createState(emptyGrid());
    // ブロック0で5が行0(セル0,1,2)にしか置けないよう候補を除去
    for (const cell of [9, 10, 11, 18, 19, 20]) {
      state.cands[cell]!.delete(5);
    }
    const move = findPointing(state);
    expect(move?.technique).toBe('pointing');
    if (move?.type !== 'eliminate') throw new Error('unreachable');
    // 行0のブロック外セル(3-8)から5を除去
    for (const cell of [3, 4, 5, 6, 7, 8]) {
      expect(move.eliminations).toContainEqual({ cell, digit: 5 });
    }
    expect(move.eliminations.find((e) => e.cell <= 2)).toBeUndefined();
  });
});

describe('findClaiming', () => {
  it('行内で1ブロックに限定された数字を、そのブロックの他セルから除去する', () => {
    const state = createState(emptyGrid());
    // 行0で5がブロック0(セル0,1,2)にしか置けないよう候補を除去
    for (const cell of [3, 4, 5, 6, 7, 8]) {
      state.cands[cell]!.delete(5);
    }
    const move = findClaiming(state);
    expect(move?.technique).toBe('claiming');
    if (move?.type !== 'eliminate') throw new Error('unreachable');
    // ブロック0の行0以外のセル(9,10,11,18,19,20)から5を除去
    for (const cell of [9, 10, 11, 18, 19, 20]) {
      expect(move.eliminations).toContainEqual({ cell, digit: 5 });
    }
  });
});

describe('findNakedTriple', () => {
  it('候補の和集合が3つになる3セルがあれば他セルから除去する', () => {
    const state = createState(emptyGrid());
    state.cands[0] = new Set([1, 2]);
    state.cands[1] = new Set([2, 3]);
    state.cands[2] = new Set([1, 3]);
    const move = findNakedTriple(state);
    expect(move?.technique).toBe('nakedTriple');
    if (move?.type !== 'eliminate') throw new Error('unreachable');
    expect(move.eliminations).toContainEqual({ cell: 3, digit: 1 });
    expect(move.eliminations).toContainEqual({ cell: 8, digit: 3 });
    expect(move.eliminations.find((e) => e.cell <= 2)).toBeUndefined();
  });
});

describe('findHiddenTriple', () => {
  it('3つの数字が同じ3セルにしか置けないとき、その3セルを3数字に限定する', () => {
    const state = createState(emptyGrid());
    // 行0で1,2,3をセル0,4,8以外から除去
    for (const cell of [1, 2, 3, 5, 6, 7]) {
      state.cands[cell]!.delete(1);
      state.cands[cell]!.delete(2);
      state.cands[cell]!.delete(3);
    }
    const move = findHiddenTriple(state);
    expect(move?.technique).toBe('hiddenTriple');
    if (move?.type !== 'eliminate') throw new Error('unreachable');
    expect(move.eliminations).toContainEqual({ cell: 0, digit: 9 });
    expect(move.eliminations).toContainEqual({ cell: 4, digit: 5 });
    expect(move.eliminations.find((e) => e.digit <= 3)).toBeUndefined();
  });
});

describe('findXWing', () => {
  it('2行で同じ2列に限定された数字を、その2列の他行から除去する', () => {
    const state = createState(emptyGrid());
    // 行0と行4で5が列2と列6にしか置けないよう候補を除去
    for (const col of [0, 1, 3, 4, 5, 7, 8]) {
      state.cands[0 * 9 + col]!.delete(5);
      state.cands[4 * 9 + col]!.delete(5);
    }
    const move = findXWing(state);
    expect(move?.technique).toBe('xWing');
    if (move?.type !== 'eliminate') throw new Error('unreachable');
    // 列2・列6の行0,4以外から5が除去される
    expect(move.eliminations).toContainEqual({ cell: 1 * 9 + 2, digit: 5 });
    expect(move.eliminations).toContainEqual({ cell: 8 * 9 + 6, digit: 5 });
    expect(
      move.eliminations.find((e) => e.cell === 2 || e.cell === 6 || e.cell === 38 || e.cell === 42),
    ).toBeUndefined();
  });
});

describe('findXYWing', () => {
  it('ピボットと2つのピンサーが見える共通セルから共通候補を除去する', () => {
    const state = createState(emptyGrid());
    state.cands[0] = new Set([1, 2]); // ピボット(r0c0)
    state.cands[1] = new Set([1, 3]); // ピンサー(r0c1、行で接続)
    state.cands[9] = new Set([2, 3]); // ピンサー(r1c0、列で接続)
    const move = findXYWing(state);
    expect(move?.technique).toBe('xyWing');
    if (move?.type !== 'eliminate') throw new Error('unreachable');
    // 両ピンサーが見えるセル(ブロック0内の10など)から3を除去
    expect(move.eliminations).toContainEqual({ cell: 10, digit: 3 });
    expect(move.eliminations.every((e) => e.digit === 3)).toBe(true);
    // ピボット・ピンサー自身からは除去しない
    expect(move.eliminations.find((e) => [0, 1, 9].includes(e.cell))).toBeUndefined();
  });

  it('該当がなければnullを返す', () => {
    expect(findXYWing(createState(emptyGrid()))).toBeNull();
  });
});

describe('applyMove', () => {
  it('配置で盤面と候補が更新される', () => {
    const state = createState(emptyGrid());
    applyMove(state, { technique: 'nakedSingle', type: 'place', cell: 0, digit: 5 });
    expect(state.grid[0]).toBe(5);
    expect(state.cands[0]).toBeNull();
    // ピアの候補から5が消える
    expect(state.cands[1]!.has(5)).toBe(false);
    expect(state.cands[9]!.has(5)).toBe(false);
    expect(state.cands[10]!.has(5)).toBe(false);
    // ピアでないセルの候補は残る
    expect(state.cands[80]!.has(5)).toBe(true);
  });

  it('除去で候補が更新される', () => {
    const state = createState(emptyGrid());
    applyMove(state, {
      technique: 'nakedPair',
      type: 'eliminate',
      eliminations: [{ cell: 3, digit: 7 }],
    });
    expect(state.cands[3]!.has(7)).toBe(false);
  });
});

describe('humanSolve', () => {
  it('例題を解いて既知の解に一致する', () => {
    const result = humanSolve(parseGrid(PUZZLE));
    expect(result.solved).toBe(true);
    expect(result.grid).toEqual(parseGrid(SOLUTION));
    expect(result.highestTier).toBeGreaterThanOrEqual(1);
  });

  it('完成盤はテクニック不要(highestTier=0)', () => {
    const result = humanSolve(parseGrid(SOLUTION));
    expect(result.solved).toBe(true);
    expect(result.highestTier).toBe(0);
  });

  it('論理テクニックの範囲外の超難問は解けないと判定する', () => {
    const grid = parseGrid(TOO_HARD);
    expect(countSolutions(grid, 2)).toBe(1); // 一意解自体は持つ
    const result = humanSolve(grid);
    expect(result.solved).toBe(false);
  });

  it('元の盤面を破壊しない', () => {
    const grid = parseGrid(PUZZLE);
    humanSolve(grid);
    expect(grid[2]).toBe(EMPTY);
  });
});
