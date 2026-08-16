import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY, parseGrid } from '../logic/board';
import type { Puzzle } from '../logic/generator';
import { createGameState, gameReducer, type GameState } from './gameReducer';
import { clearSavedGame, loadGame, saveGame } from './persistence';

const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

function makePuzzle(): Puzzle {
  const givens = parseGrid(SOLUTION);
  givens[0] = EMPTY;
  givens[1] = EMPTY;
  return { givens, solution: parseGrid(SOLUTION), difficulty: 'standard' };
}

function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  };
}

let storage: Storage;

beforeEach(() => {
  storage = makeStorage();
});

describe('saveGame / loadGame', () => {
  it('保存したゲームを復元できる(メモ・履歴含む)', () => {
    let state: GameState = createGameState(makePuzzle());
    state = gameReducer(state, { type: 'select', cell: 0 });
    state = gameReducer(state, { type: 'input', digit: 9 });
    state = gameReducer(state, { type: 'togglePencil' });
    state = gameReducer(state, { type: 'select', cell: 1 });
    state = gameReducer(state, { type: 'input', digit: 3 });

    saveGame(state, storage);
    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.board).toEqual(state.board);
    expect(loaded!.notes).toEqual(state.notes);
    expect(loaded!.past).toEqual(state.past);
    expect(loaded!.puzzle).toEqual(state.puzzle);
    expect(loaded!.pencilMode).toBe(true);
    expect(loaded!.status).toBe('playing');
  });

  it('保存がなければnullを返す', () => {
    expect(loadGame(storage)).toBeNull();
  });

  it('壊れたJSONならnullを返す', () => {
    storage.setItem('sudoku:game:v1', '{broken');
    expect(loadGame(storage)).toBeNull();
  });

  it('形式が不正ならnullを返す', () => {
    storage.setItem('sudoku:game:v1', JSON.stringify({ board: [1, 2, 3] }));
    expect(loadGame(storage)).toBeNull();
  });

  it('クリア済みゲームは保存せず、既存の保存も消す', () => {
    let state: GameState = createGameState(makePuzzle());
    saveGame(state, storage);
    state = gameReducer(state, { type: 'select', cell: 0 });
    state = gameReducer(state, { type: 'input', digit: 5 });
    state = gameReducer(state, { type: 'select', cell: 1 });
    state = gameReducer(state, { type: 'input', digit: 3 });
    expect(state.status).toBe('solved');

    saveGame(state, storage);
    expect(loadGame(storage)).toBeNull();
  });
});

describe('clearSavedGame', () => {
  it('保存を消せる', () => {
    saveGame(createGameState(makePuzzle()), storage);
    clearSavedGame(storage);
    expect(loadGame(storage)).toBeNull();
  });
});
