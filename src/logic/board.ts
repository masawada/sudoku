export const GRID_SIZE = 9;
export const BOX_SIZE = 3;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;
export const EMPTY = 0;

export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** 81要素の配列。各要素は1-9、空マスはEMPTY(0)。 */
export type Grid = number[];

export function rowOf(index: number): number {
  return Math.floor(index / GRID_SIZE);
}

export function colOf(index: number): number {
  return index % GRID_SIZE;
}

export function boxOf(index: number): number {
  return Math.floor(rowOf(index) / BOX_SIZE) * BOX_SIZE + Math.floor(colOf(index) / BOX_SIZE);
}

function buildUnits(): number[][] {
  const rows: number[][] = Array.from({ length: GRID_SIZE }, () => []);
  const cols: number[][] = Array.from({ length: GRID_SIZE }, () => []);
  const boxes: number[][] = Array.from({ length: GRID_SIZE }, () => []);
  for (let i = 0; i < CELL_COUNT; i++) {
    rows[rowOf(i)].push(i);
    cols[colOf(i)].push(i);
    boxes[boxOf(i)].push(i);
  }
  return [...rows, ...cols, ...boxes];
}

/** 27ユニット(行9・列9・ブロック9)。各ユニットは9セルのインデックス。 */
export const UNITS: readonly (readonly number[])[] = buildUnits();

function buildPeers(): number[][] {
  const peers: Set<number>[] = Array.from({ length: CELL_COUNT }, () => new Set());
  for (const unit of UNITS) {
    for (const a of unit) {
      for (const b of unit) {
        if (a !== b) peers[a].add(b);
      }
    }
  }
  return peers.map((set) => [...set]);
}

const PEERS: readonly (readonly number[])[] = buildPeers();

/** 同行・同列・同ブロックの20セル(自身を除く)。 */
export function peersOf(index: number): readonly number[] {
  return PEERS[index];
}

/** 81文字の文字列からGridを作る。'.'と'0'は空マス。 */
export function parseGrid(text: string): Grid {
  if (text.length !== CELL_COUNT) {
    throw new Error(`盤面文字列は${CELL_COUNT}文字である必要があります: ${text.length}文字`);
  }
  return [...text].map((ch) => (ch === '.' || ch === '0' ? EMPTY : Number(ch)));
}

/** ユニット内で重複している数字を持つセルのインデックス集合を返す。 */
export function findViolations(grid: Grid): Set<number> {
  const violations = new Set<number>();
  for (const unit of UNITS) {
    const byDigit = new Map<number, number[]>();
    for (const i of unit) {
      if (grid[i] === EMPTY) continue;
      const cells = byDigit.get(grid[i]) ?? [];
      cells.push(i);
      byDigit.set(grid[i], cells);
    }
    for (const cells of byDigit.values()) {
      if (cells.length > 1) {
        for (const i of cells) violations.add(i);
      }
    }
  }
  return violations;
}

/** 全マスが埋まっていて違反がなければtrue。 */
export function isComplete(grid: Grid): boolean {
  return grid.every((v) => v !== EMPTY) && findViolations(grid).size === 0;
}

/** 空マスに置ける数字の一覧(昇順)。 */
export function candidatesOf(grid: Grid, index: number): number[] {
  const used = new Set<number>();
  for (const peer of peersOf(index)) {
    if (grid[peer] !== EMPTY) used.add(grid[peer]);
  }
  return DIGITS.filter((d) => !used.has(d));
}
