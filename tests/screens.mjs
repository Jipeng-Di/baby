// Screenshots of the signed-in app, for checking UI changes on pages that need a login.
//
// Usage:
//   1. Create a test account in the app (ideally its own family with sample babies), then add to .env.local:
//        TEST_EMAIL=...
//        TEST_PASSWORD=...
//   2. Start the app (`npm run dev`) and run `npm run screens`.
//      BASE_URL defaults to http://localhost:3000; screenshots go to ./screens (git-ignored).
//   Set SCREENS_OFFLINE=1 to also log a feeding while offline and confirm it syncs when back online.
//   That writes to the test account's family, then deletes the record again.
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base = process.env.BASE_URL || 'http://localhost:3000';
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;
if (!email || !password) {
  console.error(
    'Missing TEST_EMAIL / TEST_PASSWORD in .env.local (see the comment at the top of tests/screens.mjs).',
  );
  process.exit(1);
}
const out = 'screens';
await mkdir(out, {recursive: true});

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {},
);
const errors = [];
for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport: {width: 402, height: 874},
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: scheme,
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${scheme}: ${e.message}`));
  page.on('console', m => m.type() === 'error' && errors.push(`${scheme}: ${m.text()}`));

  await page.goto(`${base}/auth`);
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.locator('form button[type=submit], form button:not([type=button])').first().click();
  await page.waitForURL(/\/today/, {timeout: 20000});
  await page.waitForTimeout(2500);

  const shot = async name => page.screenshot({path: `${out}/${scheme}-${name}.png`, fullPage: true});
  await shot('today');
  for (const path of ['history', 'trends', 'growth', 'family']) {
    await page.goto(`${base}/${path}`);
    await page.waitForTimeout(2000);
    await shot(path);
  }
  // Settings sheet and the feed sheet.
  await page
    .getByRole('button', {name: /设置|Settings/})
    .last()
    .click();
  await page.waitForTimeout(500);
  await shot('settings');
  await page.goto(`${base}/today`);
  await page.waitForTimeout(2000);
  await page
    .getByRole('button', {name: /输入奶量|Enter amount/})
    .first()
    .click();
  await page.waitForTimeout(500);
  await shot('feed-sheet');

  if (scheme === 'light' && process.env.SCREENS_OFFLINE === '1') {
    const note = `offline-check-${Date.now()}`;
    await context.setOffline(true);
    await page.locator('input[type=number]').first().fill('1');
    await page.locator('textarea').fill(note);
    await page.getByRole('button', {name: /保存记录|Save/}).click();
    await page.getByText(/还没同步|waiting to sync/).waitFor({timeout: 5000});
    await shot('offline-pending');
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.getByText(/还没同步|waiting to sync/).waitFor({state: 'detached', timeout: 40000});
    console.log('Offline save synced after reconnecting.');
    // Clean up the test record.
    await page
      .getByText(/展开今日记录|Show today/)
      .first()
      .click();
    await page.locator('button', {hasText: '1 ml'}).first().click();
    await page.getByRole('button', {name: /删除这条记录|Delete this record/}).click();
    await page.getByRole('button', {name: /^删除$|^Delete$/}).click();
    await page.waitForTimeout(1000);
  }
  await context.close();
}
await browser.close();
console.log(`Screenshots saved to ./${out}`);
if (errors.length) {
  console.log('Console errors:\n' + errors.join('\n'));
  process.exitCode = 1;
}
