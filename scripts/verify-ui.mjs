// 手動検証用スクリプト: システムChromeで本番ビルドを駆動してスクリーンショットを撮る
// 使い方: npm run build && npm i --no-save playwright-core && node scripts/verify-ui.mjs
// HTTPサーバを立てずにリクエストを横取りしてdist/から返す(サンドボックス環境対策)
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-core';

const BASE = 'http://sudoku.test/sudoku/';
const DIST = new URL('../dist', import.meta.url).pathname;
const OUT = process.env.TMPDIR ?? '/tmp';
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
const shot = (page, name) =>
  page.screenshot({ path: `${OUT}/verify-${name}.png` });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 14相当
await page.route('http://sudoku.test/**', async (route) => {
  const url = new URL(route.request().url());
  let path = url.pathname.replace(/^\/sudoku/, '') || '/';
  if (path === '/') path = '/index.html';
  try {
    const body = await readFile(join(DIST, path));
    await route.fulfill({
      body,
      contentType: MIME[extname(path)] ?? 'application/octet-stream',
    });
  } catch {
    await route.fulfill({ status: 404, body: 'not found' });
  }
});
const logs = [];
page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(BASE);
await shot(page, '01-menu');

// イージー開始(Worker生成が動くはず)
await page.getByRole('button', { name: 'イージー' }).click();
await page.waitForSelector('.board', { timeout: 30000 });
await shot(page, '02-game-easy');

// 空セルを探して数字を入れる → 同じ数字ハイライトと違反表示の確認
const emptyCells = await page.$$eval('.cell', (cells) =>
  cells.flatMap((c, i) => (c.textContent === '' ? [i] : [])),
);
console.log('empty cells:', emptyCells.length);
const target = emptyCells[0];

// 同じ行の既存数字を調べて、わざと重複する数字を入れて違反表示を見る
const rowStart = Math.floor(target / 9) * 9;
const rowValues = await page.$$eval('.cell', (cells) =>
  cells.map((c) => c.textContent),
);
const dupDigit = Array.from({ length: 9 }, (_, i) => rowValues[rowStart + i]).find(
  (v) => v !== '' && !isNaN(Number(v)),
);
await page.locator('.cell').nth(target).click();
await page.locator('.numpad-button', { hasText: dupDigit }).click();
await shot(page, '03-violation');
const violationCount = await page.locator('.cell-violation').count();
console.log('violation cells:', violationCount);

// アンドゥで戻す
await page.getByRole('button', { name: '戻す' }).click();
const afterUndo = await page.locator('.cell').nth(target).textContent();
console.log('after undo cell text:', JSON.stringify(afterUndo));

// 鉛筆モードでメモを2つ
await page.getByRole('button', { name: 'メモ' }).click();
await page.locator('.cell').nth(target).click();
await page.locator('.numpad-button', { hasText: '1' }).click();
await page.locator('.numpad-button', { hasText: '2' }).click();
await shot(page, '04-notes');
const noteText = await page.locator('.cell').nth(target).textContent();
console.log('note cell text:', JSON.stringify(noteText));
await page.getByRole('button', { name: 'メモ' }).click();

// メニューに戻って別難易度(ハード)の生成も確認
await page.getByRole('button', { name: '← メニュー' }).click();
const t0 = Date.now();
await page.getByRole('button', { name: 'ハード' }).click();
await page.waitForSelector('.board', { timeout: 60000 });
console.log('hard generation took', Date.now() - t0, 'ms');
await shot(page, '05-game-hard');

// ダークモード表示
await page.emulateMedia({ colorScheme: 'dark' });
await shot(page, '06-dark');

console.log(logs.length ? logs.join('\n') : '(no console errors)');
await browser.close();
