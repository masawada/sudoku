import { describe, expect, it } from 'vitest';
import {
  BOX_SIZE,
  CELL_COUNT,
  EMPTY,
  GRID_SIZE,
  UNITS,
  boxOf,
  candidatesOf,
  colOf,
  findViolations,
  isComplete,
  parseGrid,
  peersOf,
  rowOf,
} from './board';

// テスト用の完成盤(有効な数独の解)
const SOLVED =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

describe('定数', () => {
  it('9x9=81マス、3x3ブロック', () => {
    expect(GRID_SIZE).toBe(9);
    expect(BOX_SIZE).toBe(3);
    expect(CELL_COUNT).toBe(81);
    expect(EMPTY).toBe(0);
  });
});

describe('parseGrid', () => {
  it('81文字の文字列をGridに変換する', () => {
    const grid = parseGrid(SOLVED);
    expect(grid).toHaveLength(81);
    expect(grid[0]).toBe(5);
    expect(grid[80]).toBe(9);
  });

  it('.と0を空マスとして扱う', () => {
    const grid = parseGrid('.0'.padEnd(81, '1'));
    expect(grid[0]).toBe(EMPTY);
    expect(grid[1]).toBe(EMPTY);
    expect(grid[2]).toBe(1);
  });

  it('81文字でなければ例外を投げる', () => {
    expect(() => parseGrid('123')).toThrow();
  });
});

describe('座標変換', () => {
  it('rowOf/colOf/boxOfがインデックスから行・列・ブロック番号を返す', () => {
    expect(rowOf(0)).toBe(0);
    expect(colOf(0)).toBe(0);
    expect(boxOf(0)).toBe(0);
    expect(rowOf(80)).toBe(8);
    expect(colOf(80)).toBe(8);
    expect(boxOf(80)).toBe(8);
    // index 40 = 中央(row4, col4, box4)
    expect(rowOf(40)).toBe(4);
    expect(colOf(40)).toBe(4);
    expect(boxOf(40)).toBe(4);
    // index 11 = row1, col2, box0
    expect(rowOf(11)).toBe(1);
    expect(colOf(11)).toBe(2);
    expect(boxOf(11)).toBe(0);
  });
});

describe('UNITS', () => {
  it('行9+列9+ブロック9の27ユニットを持つ', () => {
    expect(UNITS).toHaveLength(27);
    for (const unit of UNITS) {
      expect(unit).toHaveLength(9);
    }
  });

  it('全ユニットの合計で各セルがちょうど3回現れる', () => {
    const counts = new Array(81).fill(0);
    for (const unit of UNITS) {
      for (const i of unit) counts[i]++;
    }
    expect(counts.every((c) => c === 3)).toBe(true);
  });
});

describe('peersOf', () => {
  it('各セルは20個のピア(同行・同列・同ブロック)を持つ', () => {
    expect(peersOf(0)).toHaveLength(20);
    expect(peersOf(40)).toHaveLength(20);
  });

  it('セル0のピアに同行・同列・同ブロックのセルが含まれ、自身は含まれない', () => {
    const peers = peersOf(0);
    expect(peers).toContain(1); // 同行
    expect(peers).toContain(9); // 同列
    expect(peers).toContain(10); // 同ブロック
    expect(peers).not.toContain(0);
  });
});

describe('findViolations', () => {
  it('違反がなければ空集合を返す', () => {
    const grid = parseGrid(SOLVED);
    expect(findViolations(grid).size).toBe(0);
  });

  it('同じ行の重複セルを両方返す', () => {
    const grid = parseGrid('55'.padEnd(81, '.'));
    const violations = findViolations(grid);
    expect(violations.has(0)).toBe(true);
    expect(violations.has(1)).toBe(true);
    expect(violations.size).toBe(2);
  });

  it('同じ列の重複セルを返す', () => {
    const s = '3' + '.'.repeat(8) + '3' + '.'.repeat(71);
    const violations = findViolations(parseGrid(s));
    expect(violations.has(0)).toBe(true);
    expect(violations.has(9)).toBe(true);
  });

  it('同じブロックの重複セルを返す', () => {
    const s = '7' + '.'.repeat(9) + '7' + '.'.repeat(70);
    const violations = findViolations(parseGrid(s));
    expect(violations.has(0)).toBe(true);
    expect(violations.has(10)).toBe(true);
  });

  it('空マスは違反にならない', () => {
    const grid = parseGrid('.'.repeat(81));
    expect(findViolations(grid).size).toBe(0);
  });
});

describe('isComplete', () => {
  it('正しい完成盤でtrueを返す', () => {
    expect(isComplete(parseGrid(SOLVED))).toBe(true);
  });

  it('空マスがあればfalseを返す', () => {
    const grid = parseGrid(SOLVED);
    grid[0] = EMPTY;
    expect(isComplete(grid)).toBe(false);
  });

  it('全部埋まっていても違反があればfalseを返す', () => {
    const grid = parseGrid(SOLVED);
    grid[0] = grid[1];
    expect(isComplete(grid)).toBe(false);
  });
});

describe('candidatesOf', () => {
  it('空盤面では1-9すべてが候補になる', () => {
    const grid = parseGrid('.'.repeat(81));
    expect(candidatesOf(grid, 0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('ピアに置かれた数字は候補から除外される', () => {
    const s = '12' + '.'.repeat(7) + '3' + '.'.repeat(71);
    const grid = parseGrid(s);
    // セル10のピア: 1(値2は同ブロック), 0(値1), 9(値3)
    expect(candidatesOf(grid, 10)).toEqual([4, 5, 6, 7, 8, 9]);
  });

  it('完成盤の唯一の空マスには元の数字だけが候補になる', () => {
    const grid = parseGrid(SOLVED);
    const original = grid[40];
    grid[40] = EMPTY;
    expect(candidatesOf(grid, 40)).toEqual([original]);
  });
});
