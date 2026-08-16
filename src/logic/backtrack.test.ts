import { describe, expect, it } from 'vitest';
import { EMPTY, isComplete, parseGrid } from './board';
import { countSolutions, generateSolvedGrid, solve } from './backtrack';
import { createRng } from './rng';

// Wikipediaの例題(一意解を持つ)とその解
const PUZZLE =
  '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('countSolutions', () => {
  it('完成盤の解は1', () => {
    expect(countSolutions(parseGrid(SOLUTION), 2)).toBe(1);
  });

  it('一意解を持つ問題の解は1', () => {
    expect(countSolutions(parseGrid(PUZZLE), 2)).toBe(1);
  });

  it('空盤面は複数解(limitで打ち切り)', () => {
    expect(countSolutions(parseGrid('.'.repeat(81)), 2)).toBe(2);
  });

  it('矛盾した盤面の解は0', () => {
    const grid = parseGrid(PUZZLE);
    grid[2] = 5; // 同じ行に5がすでにある
    expect(countSolutions(grid, 2)).toBe(0);
  });
});

describe('solve', () => {
  it('問題を解いて既知の解に一致する', () => {
    expect(solve(parseGrid(PUZZLE))).toEqual(parseGrid(SOLUTION));
  });

  it('解けない盤面はnullを返す', () => {
    const grid = parseGrid(PUZZLE);
    grid[2] = 5;
    expect(solve(grid)).toBeNull();
  });

  it('元の盤面を破壊しない', () => {
    const grid = parseGrid(PUZZLE);
    solve(grid);
    expect(grid[2]).toBe(EMPTY);
  });
});

describe('generateSolvedGrid', () => {
  it('有効な完成盤を生成する', () => {
    const grid = generateSolvedGrid(createRng(42));
    expect(isComplete(grid)).toBe(true);
  });

  it('シードが違えば異なる盤面になる', () => {
    const a = generateSolvedGrid(createRng(1));
    const b = generateSolvedGrid(createRng(2));
    expect(a).not.toEqual(b);
  });

  it('同じシードなら同じ盤面になる(再現性)', () => {
    const a = generateSolvedGrid(createRng(7));
    const b = generateSolvedGrid(createRng(7));
    expect(a).toEqual(b);
  });
});
