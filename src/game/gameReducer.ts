import { EMPTY, isComplete, peersOf, type Grid } from '../logic/board';
import type { Puzzle } from '../logic/generator';

/** メモはセルごとのビットマスク(bit d-1 = 数字d)。 */
export function noteBit(digit: number): number {
  return 1 << (digit - 1);
}

interface Snapshot {
  board: Grid;
  notes: number[];
}

export interface GameState {
  puzzle: Puzzle;
  board: Grid;
  notes: number[];
  selected: number | null;
  pencilMode: boolean;
  past: Snapshot[];
  future: Snapshot[];
  status: 'playing' | 'solved';
}

export type GameAction =
  | { type: 'select'; cell: number }
  | { type: 'input'; digit: number }
  | { type: 'erase' }
  | { type: 'togglePencil' }
  | { type: 'undo' }
  | { type: 'redo' };

export function createGameState(puzzle: Puzzle): GameState {
  return {
    puzzle,
    board: [...puzzle.givens],
    notes: puzzle.givens.map(() => 0),
    selected: null,
    pencilMode: false,
    past: [],
    future: [],
    status: 'playing',
  };
}

function snapshot(state: GameState): Snapshot {
  return { board: state.board, notes: state.notes };
}

/** 盤面・メモの変更をアンドゥ履歴に積んで適用する。 */
function commit(state: GameState, board: Grid, notes: number[]): GameState {
  return {
    ...state,
    board,
    notes,
    past: [...state.past, snapshot(state)],
    future: [],
    status: isComplete(board) && board.every((v, i) => v === state.puzzle.solution[i])
      ? 'solved'
      : 'playing',
  };
}

function isGiven(state: GameState, cell: number): boolean {
  return state.puzzle.givens[cell] !== EMPTY;
}

function inputDigit(state: GameState, digit: number): GameState {
  const cell = state.selected;
  if (cell === null || isGiven(state, cell)) return state;

  if (state.pencilMode) {
    if (state.board[cell] !== EMPTY) return state;
    const notes = [...state.notes];
    notes[cell] ^= noteBit(digit);
    return commit(state, state.board, notes);
  }

  const board = [...state.board];
  const notes = [...state.notes];
  if (board[cell] === digit) {
    board[cell] = EMPTY;
  } else {
    board[cell] = digit;
    notes[cell] = 0;
    for (const peer of peersOf(cell)) {
      notes[peer] &= ~noteBit(digit);
    }
  }
  return commit(state, board, notes);
}

function erase(state: GameState): GameState {
  const cell = state.selected;
  if (cell === null || isGiven(state, cell)) return state;
  if (state.board[cell] === EMPTY && state.notes[cell] === 0) return state;
  const board = [...state.board];
  const notes = [...state.notes];
  board[cell] = EMPTY;
  notes[cell] = 0;
  return commit(state, board, notes);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'select':
      return { ...state, selected: action.cell };
    case 'togglePencil':
      return { ...state, pencilMode: !state.pencilMode };
    case 'input':
      return state.status === 'solved' ? state : inputDigit(state, action.digit);
    case 'erase':
      return state.status === 'solved' ? state : erase(state);
    case 'undo': {
      const prev = state.past.at(-1);
      if (!prev) return state;
      return {
        ...state,
        board: prev.board,
        notes: prev.notes,
        past: state.past.slice(0, -1),
        future: [...state.future, snapshot(state)],
        status: 'playing',
      };
    }
    case 'redo': {
      const next = state.future.at(-1);
      if (!next) return state;
      return {
        ...state,
        board: next.board,
        notes: next.notes,
        past: [...state.past, snapshot(state)],
        future: state.future.slice(0, -1),
        status:
          isComplete(next.board) &&
          next.board.every((v, i) => v === state.puzzle.solution[i])
            ? 'solved'
            : 'playing',
      };
    }
  }
}
