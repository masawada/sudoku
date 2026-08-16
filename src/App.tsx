import { useCallback, useEffect, useState } from 'react';
import type { Difficulty } from './logic/generator';
import { generatePuzzleAsync } from './game/generatePuzzleAsync';
import { createGameState, gameReducer, type GameAction, type GameState } from './game/gameReducer';
import { loadGame, saveGame } from './game/persistence';
import { DIFFICULTY_LABELS, GameScreen } from './components/GameScreen';

const DIFFICULTIES: Difficulty[] = ['easy', 'standard', 'hard'];

function App() {
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);

  const dispatch = useCallback((action: GameAction) => {
    setGame((current) => (current ? gameReducer(current, action) : current));
  }, []);

  const startGame = useCallback((difficulty: Difficulty) => {
    const saved = loadGame();
    if (saved && !window.confirm('進行中のゲームがあります。新しく始めると破棄されます。')) {
      return;
    }
    setLoading(true);
    generatePuzzleAsync(difficulty)
      .then((puzzle) => setGame(createGameState(puzzle)))
      .finally(() => setLoading(false));
  }, []);

  if (game) {
    return (
      <GameScreen
        game={game}
        dispatch={dispatch}
        onBackToMenu={() => setGame(null)}
        onNewGame={startGame}
      />
    );
  }

  const saved = loadGame();

  return (
    <div className="menu-screen">
      <h1 className="app-title">数独</h1>
      <div className="menu-buttons">
        {saved && (
          <button
            type="button"
            className="primary-button"
            disabled={loading}
            onClick={() => setGame(saved)}
          >
            続きから({DIFFICULTY_LABELS[saved.puzzle.difficulty]})
          </button>
        )}
        {DIFFICULTIES.map((difficulty) => (
          <button
            key={difficulty}
            type="button"
            className="primary-button"
            disabled={loading}
            onClick={() => startGame(difficulty)}
          >
            {DIFFICULTY_LABELS[difficulty]}
          </button>
        ))}
      </div>
      {loading && <p className="loading-note">問題を生成中…</p>}
    </div>
  );
}

export default App;
