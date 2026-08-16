import { CELL_COUNT } from '../logic/board';
import type { GameState } from './gameReducer';

const STORAGE_KEY = 'sudoku:game:v1';

/** プレイ中のゲームを保存する。クリア済みなら保存を消す。 */
export function saveGame(state: GameState, storage: Storage = localStorage): void {
  if (state.status === 'solved') {
    clearSavedGame(storage);
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isValidGrid(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === CELL_COUNT &&
    value.every((v) => Number.isInteger(v) && v >= 0 && v <= 9)
  );
}

/** 保存されたゲームを返す。なければ・壊れていればnull。 */
export function loadGame(storage: Storage = localStorage): GameState | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  try {
    const state = JSON.parse(raw) as GameState;
    if (
      !isValidGrid(state.board) ||
      !isValidGrid(state.puzzle?.givens) ||
      !isValidGrid(state.puzzle?.solution) ||
      !Array.isArray(state.notes) ||
      !Array.isArray(state.past) ||
      !Array.isArray(state.future) ||
      state.status !== 'playing'
    ) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function clearSavedGame(storage: Storage = localStorage): void {
  storage.removeItem(STORAGE_KEY);
}
