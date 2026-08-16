import { describe, expect, it } from 'vitest';
import { EMPTY, parseGrid } from '../logic/board';
import type { Puzzle } from '../logic/generator';
import {
  createGameState,
  gameReducer,
  noteBit,
  type GameAction,
  type GameState,
} from './gameReducer';

const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

// セル0(=5)とセル1(=3)だけ空けた盤面
function makePuzzle(): Puzzle {
  const givens = parseGrid(SOLUTION);
  givens[0] = EMPTY;
  givens[1] = EMPTY;
  return { givens, solution: parseGrid(SOLUTION), difficulty: 'easy' };
}

function reduce(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

describe('createGameState', () => {
  it('盤面はヒント通り、メモなし、プレイ中で始まる', () => {
    const state = createGameState(makePuzzle());
    expect(state.board).toEqual(makePuzzle().givens);
    expect(state.notes.every((n) => n === 0)).toBe(true);
    expect(state.status).toBe('playing');
    expect(state.selected).toBeNull();
    expect(state.pencilMode).toBe(false);
  });
});

describe('select', () => {
  it('セルを選択できる', () => {
    const state = reduce(createGameState(makePuzzle()), { type: 'select', cell: 0 });
    expect(state.selected).toBe(0);
  });

  it('選択はアンドゥ履歴に積まれない', () => {
    const state = reduce(createGameState(makePuzzle()), { type: 'select', cell: 0 });
    expect(state.past).toHaveLength(0);
  });
});

describe('input(数字入力)', () => {
  it('選択中の空セルに数字を置ける', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'input', digit: 5 },
    );
    expect(state.board[0]).toBe(5);
  });

  it('解と違う数字も置ける(正解照合しない)', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'input', digit: 9 },
    );
    expect(state.board[0]).toBe(9);
  });

  it('同じ数字をもう一度入力すると消える(トグル)', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'input', digit: 5 },
      { type: 'input', digit: 5 },
    );
    expect(state.board[0]).toBe(EMPTY);
  });

  it('ヒントセルには入力できない', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 2 },
      { type: 'input', digit: 9 },
    );
    expect(state.board[2]).toBe(4); // ヒントのまま
    expect(state.past).toHaveLength(0);
  });

  it('未選択なら何も起きない', () => {
    const state = reduce(createGameState(makePuzzle()), { type: 'input', digit: 5 });
    expect(state.board).toEqual(makePuzzle().givens);
  });

  it('確定入力で同じセルのメモが消える', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'togglePencil' },
      { type: 'input', digit: 1 },
      { type: 'togglePencil' },
      { type: 'input', digit: 5 },
    );
    expect(state.board[0]).toBe(5);
    expect(state.notes[0]).toBe(0);
  });

  it('確定入力でピア(同行・同列・同ブロック)のメモから該当数字が消える', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      // セル1に5と6をメモ
      { type: 'select', cell: 1 },
      { type: 'togglePencil' },
      { type: 'input', digit: 5 },
      { type: 'input', digit: 6 },
      { type: 'togglePencil' },
      // セル0に5を確定
      { type: 'select', cell: 0 },
      { type: 'input', digit: 5 },
    );
    expect(state.notes[1] & noteBit(5)).toBe(0);
    expect(state.notes[1] & noteBit(6)).not.toBe(0);
  });
});

describe('pencil(メモ入力)', () => {
  it('鉛筆モードでメモをトグルできる', () => {
    const base = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'togglePencil' },
      { type: 'input', digit: 3 },
    );
    expect(base.notes[0] & noteBit(3)).not.toBe(0);
    const toggled = reduce(base, { type: 'input', digit: 3 });
    expect(toggled.notes[0] & noteBit(3)).toBe(0);
  });

  it('確定値のあるセルにはメモできない', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'input', digit: 5 },
      { type: 'togglePencil' },
      { type: 'input', digit: 3 },
    );
    expect(state.notes[0]).toBe(0);
  });
});

describe('erase(消去)', () => {
  it('確定値を消せる', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'input', digit: 9 },
      { type: 'erase' },
    );
    expect(state.board[0]).toBe(EMPTY);
  });

  it('メモを消せる', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'togglePencil' },
      { type: 'input', digit: 3 },
      { type: 'togglePencil' },
      { type: 'erase' },
    );
    expect(state.notes[0]).toBe(0);
  });

  it('ヒントセルは消せない', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 2 },
      { type: 'erase' },
    );
    expect(state.board[2]).toBe(4);
    expect(state.past).toHaveLength(0);
  });

  it('空セルへの消去は履歴に積まれない', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'erase' },
    );
    expect(state.past).toHaveLength(0);
  });
});

describe('undo/redo', () => {
  it('入力を取り消して戻せる', () => {
    const placed = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'input', digit: 9 },
    );
    const undone = reduce(placed, { type: 'undo' });
    expect(undone.board[0]).toBe(EMPTY);
    const redone = reduce(undone, { type: 'redo' });
    expect(redone.board[0]).toBe(9);
  });

  it('メモのトグルも取り消せる', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'togglePencil' },
      { type: 'input', digit: 3 },
      { type: 'undo' },
    );
    expect(state.notes[0]).toBe(0);
  });

  it('新しい操作でredo履歴が消える', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'input', digit: 9 },
      { type: 'undo' },
      { type: 'input', digit: 8 },
    );
    expect(state.future).toHaveLength(0);
  });

  it('履歴がなければ何も起きない', () => {
    const state = reduce(createGameState(makePuzzle()), { type: 'undo' }, { type: 'redo' });
    expect(state.board).toEqual(makePuzzle().givens);
  });

  it('ピアのメモ自動削除もまとめて取り消される', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 1 },
      { type: 'togglePencil' },
      { type: 'input', digit: 5 },
      { type: 'togglePencil' },
      { type: 'select', cell: 0 },
      { type: 'input', digit: 5 },
      { type: 'undo' },
    );
    expect(state.board[0]).toBe(EMPTY);
    expect(state.notes[1] & noteBit(5)).not.toBe(0);
  });
});

describe('クリア判定', () => {
  it('最後のセルを正しく埋めるとsolvedになる', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'input', digit: 5 },
      { type: 'select', cell: 1 },
      { type: 'input', digit: 3 },
    );
    expect(state.status).toBe('solved');
  });

  it('間違った数字で埋まってもsolvedにならない', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'input', digit: 3 },
      { type: 'select', cell: 1 },
      { type: 'input', digit: 5 },
    );
    expect(state.status).toBe('playing');
  });

  it('solved後は入力を受け付けない', () => {
    const state = reduce(
      createGameState(makePuzzle()),
      { type: 'select', cell: 0 },
      { type: 'input', digit: 5 },
      { type: 'select', cell: 1 },
      { type: 'input', digit: 3 },
      { type: 'input', digit: 9 },
    );
    expect(state.board[1]).toBe(3);
    expect(state.status).toBe('solved');
  });
});

describe('noteBit', () => {
  it('数字ごとに異なるビットを返す', () => {
    expect(noteBit(1)).toBe(1);
    expect(noteBit(9)).toBe(256);
  });
});
