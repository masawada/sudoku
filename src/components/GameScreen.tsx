import { useMemo } from 'react';
import { findViolations } from '../logic/board';
import type { Difficulty } from '../logic/generator';
import type { GameAction, GameState } from '../game/gameReducer';
import { Board } from './Board';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'イージー',
  standard: 'スタンダード',
  hard: 'ハード',
};

interface GameScreenProps {
  game: GameState;
  dispatch: (action: GameAction) => void;
  onBackToMenu: () => void;
  onNewGame: (difficulty: Difficulty) => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function GameScreen({ game, dispatch, onBackToMenu, onNewGame }: GameScreenProps) {
  const violations = useMemo(() => findViolations(game.board), [game.board]);

  return (
    <div className="game-screen">
      <header className="game-header">
        <button type="button" className="text-button" onClick={onBackToMenu}>
          ← メニュー
        </button>
        <span className="difficulty-label">{DIFFICULTY_LABELS[game.puzzle.difficulty]}</span>
      </header>

      <Board
        game={game}
        violations={violations}
        onSelect={(cell) => dispatch({ type: 'select', cell })}
      />

      <div className="controls">
        <button
          type="button"
          className="control-button"
          disabled={game.past.length === 0}
          onClick={() => dispatch({ type: 'undo' })}
        >
          ↩<span className="control-label">戻す</span>
        </button>
        <button
          type="button"
          className="control-button"
          disabled={game.future.length === 0}
          onClick={() => dispatch({ type: 'redo' })}
        >
          ↪<span className="control-label">やり直す</span>
        </button>
        <button
          type="button"
          className="control-button"
          onClick={() => dispatch({ type: 'erase' })}
        >
          ⌫<span className="control-label">消す</span>
        </button>
        <button
          type="button"
          className={game.pencilMode ? 'control-button control-active' : 'control-button'}
          onClick={() => dispatch({ type: 'togglePencil' })}
        >
          ✎<span className="control-label">メモ</span>
        </button>
      </div>

      <div className="numpad">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            className="numpad-button"
            onClick={() => dispatch({ type: 'input', digit })}
          >
            {digit}
          </button>
        ))}
      </div>

      {game.status === 'solved' && (
        <div className="overlay">
          <div className="overlay-card">
            <p className="overlay-title">クリア!</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => onNewGame(game.puzzle.difficulty)}
            >
              もう一度{DIFFICULTY_LABELS[game.puzzle.difficulty]}
            </button>
            <button type="button" className="text-button" onClick={onBackToMenu}>
              メニューへ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
