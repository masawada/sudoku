import { describe, expect, it } from 'vitest';
import { CELL_COUNT, EMPTY, parseGrid } from './board';
import { countSolutions } from './backtrack';
import { humanSolve } from './humanSolver';
import { createRng } from './rng';
import { generatePuzzle, rateDifficulty, type Difficulty } from './generator';

const TOO_HARD =
  '8..........36......7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..';

describe('rateDifficulty', () => {
  it('論理テクニックで解けない盤面はnullを返す', () => {
    expect(rateDifficulty(parseGrid(TOO_HARD))).toBeNull();
  });
});

describe.each<Difficulty>(['easy', 'standard', 'hard'])('generatePuzzle(%s)', (difficulty) => {
  const puzzle = generatePuzzle(difficulty, createRng(42));

  it('ヒントは解と一致し、空マスがある', () => {
    let givenCount = 0;
    for (let i = 0; i < CELL_COUNT; i++) {
      if (puzzle.givens[i] !== EMPTY) {
        givenCount++;
        expect(puzzle.givens[i]).toBe(puzzle.solution[i]);
      }
    }
    expect(givenCount).toBeLessThan(CELL_COUNT);
    expect(givenCount).toBeGreaterThan(16);
  });

  it('一意解を持つ', () => {
    expect(countSolutions(puzzle.givens, 2)).toBe(1);
  });

  it('指定した難易度に判定される', () => {
    expect(puzzle.difficulty).toBe(difficulty);
    expect(rateDifficulty(puzzle.givens)).toBe(difficulty);
  });

  it('人間的テクニックだけで解けて解に一致する', () => {
    const result = humanSolve(puzzle.givens);
    expect(result.solved).toBe(true);
    expect(result.grid).toEqual(puzzle.solution);
  });

  it('同じシードなら同じ問題になる(再現性)', () => {
    const again = generatePuzzle(difficulty, createRng(42));
    expect(again.givens).toEqual(puzzle.givens);
  });
});

describe('難易度の分離', () => {
  it('easyはsinglesのみ(tier1以下)で解ける', () => {
    const puzzle = generatePuzzle('easy', createRng(7));
    expect(humanSolve(puzzle.givens).highestTier).toBeLessThanOrEqual(1);
  });

  it('standardはtier2のテクニックを要求する', () => {
    const puzzle = generatePuzzle('standard', createRng(7));
    expect(humanSolve(puzzle.givens).highestTier).toBe(2);
  });

  it('hardはtier3のテクニックを要求する', () => {
    const puzzle = generatePuzzle('hard', createRng(7));
    expect(humanSolve(puzzle.givens).highestTier).toBe(3);
  });
});
