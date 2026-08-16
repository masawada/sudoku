// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EMPTY, parseGrid } from './logic/board';
import { generatePuzzle, type Puzzle } from './logic/generator';
import { createRng } from './logic/rng';
import App from './App';

// Web Workerはjsdomにないため、生成を同期実行するモックに差し替える
const mockGenerate = vi.hoisted(() => ({
  impl: null as ((difficulty: string) => Puzzle) | null,
}));
vi.mock('./game/generatePuzzleAsync', () => ({
  generatePuzzleAsync: (difficulty: string) =>
    Promise.resolve(mockGenerate.impl!(difficulty)),
}));

const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

beforeEach(() => {
  cleanup();
  mockGenerate.impl = (difficulty) =>
    generatePuzzle(difficulty as Puzzle['difficulty'], createRng(42));
});

async function startEasyGame() {
  const { container } = render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'イージー' }));
  await waitFor(() => expect(container.querySelectorAll('.cell')).toHaveLength(81));
  return container;
}

describe('App', () => {
  it('メニューに3つの難易度ボタンが表示される', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'イージー' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'スタンダード' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ハード' })).toBeTruthy();
  });

  it('難易度を選ぶと盤面が表示される', async () => {
    const container = await startEasyGame();
    expect(container.querySelectorAll('.cell-given').length).toBeGreaterThan(16);
  });

  it('空セルに数字を入力できて、アンドゥで戻せる', async () => {
    const container = await startEasyGame();
    const cells = [...container.querySelectorAll<HTMLButtonElement>('.cell')];
    const empty = cells.find((c) => c.textContent === '')!;
    await userEvent.click(empty);
    await userEvent.click(container.querySelector('.numpad-button')!); // 「1」
    expect(empty.textContent).toBe('1');
    await userEvent.click(screen.getByRole('button', { name: /戻す/ }));
    expect(empty.textContent).toBe('');
  });

  it('鉛筆モードでメモが表示される', async () => {
    const container = await startEasyGame();
    const cells = [...container.querySelectorAll<HTMLButtonElement>('.cell')];
    const empty = cells.find((c) => c.textContent === '')!;
    await userEvent.click(screen.getByRole('button', { name: /メモ/ }));
    await userEvent.click(empty);
    await userEvent.click(container.querySelector('.numpad-button')!);
    expect(empty.querySelector('.cell-notes')).toBeTruthy();
  });

  it('行に重複する数字を入れると違反表示になる', async () => {
    const container = await startEasyGame();
    const cells = [...container.querySelectorAll<HTMLButtonElement>('.cell')];
    const emptyIndex = cells.findIndex((c) => c.textContent === '');
    // 同じ行にある既存の数字を重複入力する
    const rowStart = Math.floor(emptyIndex / 9) * 9;
    const dup = cells
      .slice(rowStart, rowStart + 9)
      .map((c) => c.textContent)
      .find((t) => t !== '')!;
    await userEvent.click(cells[emptyIndex]);
    const numpad = [...container.querySelectorAll<HTMLButtonElement>('.numpad-button')];
    await userEvent.click(numpad.find((b) => b.textContent === dup)!);
    expect(container.querySelectorAll('.cell-violation').length).toBeGreaterThanOrEqual(2);
  });

  it('最後のセルを埋めるとクリア画面が出て、メニューに戻れる', async () => {
    // 1マスだけ空のパズルに差し替え
    mockGenerate.impl = () => {
      const givens = parseGrid(SOLUTION);
      givens[0] = EMPTY;
      return { givens, solution: parseGrid(SOLUTION), difficulty: 'easy' };
    };
    const container = await startEasyGame();
    const cells = [...container.querySelectorAll<HTMLButtonElement>('.cell')];
    await userEvent.click(cells[0]);
    const numpad = [...container.querySelectorAll<HTMLButtonElement>('.numpad-button')];
    await userEvent.click(numpad.find((b) => b.textContent === '5')!); // 解は5
    expect(screen.getByText('クリア!')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'メニューへ' }));
    expect(screen.getByRole('button', { name: 'イージー' })).toBeTruthy();
  });
});
