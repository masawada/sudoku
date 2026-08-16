import { EMPTY, colOf, peersOf, rowOf } from '../logic/board';
import { noteBit, type GameState } from '../game/gameReducer';

interface BoardProps {
  game: GameState;
  violations: Set<number>;
  onSelect: (cell: number) => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Board({ game, violations, onSelect }: BoardProps) {
  const { board, notes, selected, puzzle } = game;
  const selectedValue = selected !== null ? board[selected] : EMPTY;
  const peerSet = selected !== null ? new Set(peersOf(selected)) : null;

  return (
    <div className="board" role="grid">
      {board.map((value, cell) => {
        const classes = ['cell'];
        if (colOf(cell) % 3 === 2 && colOf(cell) !== 8) classes.push('cell-right-edge');
        if (rowOf(cell) % 3 === 2 && rowOf(cell) !== 8) classes.push('cell-bottom-edge');
        if (puzzle.givens[cell] !== EMPTY) classes.push('cell-given');
        if (cell === selected) classes.push('cell-selected');
        else if (peerSet?.has(cell)) classes.push('cell-peer');
        if (value !== EMPTY && value === selectedValue && cell !== selected) {
          classes.push('cell-same-digit');
        }
        if (violations.has(cell)) classes.push('cell-violation');

        return (
          <button
            key={cell}
            type="button"
            className={classes.join(' ')}
            onClick={() => onSelect(cell)}
          >
            {value !== EMPTY ? (
              value
            ) : notes[cell] !== 0 ? (
              <span className="cell-notes">
                {DIGITS.map((d) => (
                  <span key={d} className="note">
                    {notes[cell] & noteBit(d) ? d : ''}
                  </span>
                ))}
              </span>
            ) : (
              ''
            )}
          </button>
        );
      })}
    </div>
  );
}
