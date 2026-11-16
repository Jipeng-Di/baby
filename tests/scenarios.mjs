// End-to-end scenarios with ten realistic test families, driven through the real UI with Playwright.
//
// Usage:
//   node --env-file=.env.local tests/scenarios.mjs
//
// Needs NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Accounts are created with the anon
// key via signUp, which only works while "Confirm email" is OFF in Supabase Auth; with
// SUPABASE_SERVICE_ROLE_KEY set they are created pre-confirmed through the admin API instead.
//   BASE_URL        app to test (default: the production site)
//   CHROMIUM_PATH   a Chrome/Chromium binary when Playwright has no bundled browser
//   KEEP=1          leave the test accounts and their data in place afterwards
//   ONLY=<regex>    run only the scenarios whose name matches
// Screenshots go to screens/scenarios/ (git-ignored). Every account's data is removed at the end
// through the in-app delete_account() RPC.
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';

const base = process.env.BASE_URL || 'https://baby-feeding-three.vercel.app';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
const run = Date.now().toString(36);
const PASSWORD = `Feedbook-${run}-Aa1!`;
const out = 'screens/scenarios';
await mkdir(out, {recursive: true});

/** Ten families with the situations the app is meant to handle. */
const people = [
  {key: 'emily', name: 'Emily', note: 'new mom, 3-week-old Noah'},
  {key: 'james', name: 'James', note: 'joins Emily with the family code'},
  {key: 'liting', name: '李婷', note: 'twins 糯米 and 团子, Chinese UI'},
  {key: 'sofia', name: 'Sofia', note: 'breastfeeds Luca, logs minutes'},
  {key: 'aisha', name: 'Aisha', note: 'Zara born at 34+2, corrected age'},
  {key: 'wangfang', name: '王芳', note: '6-month-old 小宝, growth records'},
  {key: 'maria', name: 'Maria', note: 'Mateo: moments, vaccines, checkup'},
  {key: 'hannah', name: 'Hannah', note: 'oz unit, Chinese guide region'},
  {key: 'chen', name: 'Chen', note: 'offline logging and CSV export'},
  {key: 'olivia', name: 'Olivia', note: 'deletes her account'},
];
const email = p => `feedbook.qa.${p.key}.${run}@mailinator.com`;
const ago = days => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

// ---------- accounts
const admin = service ? createClient(url, service, {auth: {persistSession: false}}) : null;
async function createAccount(p) {
  if (admin) {
    const {error} = await admin.auth.admin.createUser({
      email: email(p),
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {display_name: p.name},
    });
    if (error) throw error;
    return;
  }
  const sb = createClient(url, anon, {auth: {persistSession: false}});
  const {data, error} = await sb.auth.signUp({
    email: email(p),
    password: PASSWORD,
    options: {data: {display_name: p.name}},
  });
  if (error) throw error;
  if (!data.session)
    throw new Error(
      'signUp returned no session: turn off "Confirm email" in Supabase Auth, or set SUPABASE_SERVICE_ROLE_KEY',
    );
  await sb.from('profiles').upsert({id: data.user.id, display_name: p.name});
}
async function deleteAccount(p) {
  const sb = createClient(url, anon, {auth: {persistSession: false}});
  const {error} = await sb.auth.signInWithPassword({email: email(p), password: PASSWORD});
  if (error) return `sign-in failed (${error.message})`;
  const {error: e} = await sb.rpc('delete_account');
  if (!e) return 'deleted';
  if (!admin) return `delete_account failed (${e.message})`;
  // Fallback through the admin API so a broken RPC never leaves test data behind.
  const uid = (await sb.auth.getUser()).data.user?.id;
  await admin.from('families').delete().eq('created_by', uid);
  const {error: d} = await admin.auth.admin.deleteUser(uid);
  return d
    ? `delete_account failed (${e.message}); admin delete failed (${d.message})`
    : `deleted via admin (RPC failed: ${e.message})`;
}

// ---------- browser helpers
/** Poll the URL instead of page.waitForURL, which misses Next's client-side replace(). */
async function waitUrl(page, re, {timeout = 30000} = {}) {
  const started = Date.now();
  while (!re.test(page.url())) {
    if (Date.now() - started > timeout) throw new Error(`waitUrl ${re} timed out at ${page.url()}`);
    await page.waitForTimeout(200);
  }
}
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {},
);
const results = [];
let shotIndex = 0;
async function scenario(name, fn) {
  if (process.env.ONLY && !new RegExp(process.env.ONLY).test(name)) return;
  const context = await browser.newContext({
    viewport: {width: 402, height: 874},
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.stack || e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text());
  });
  const shot = async label =>
    page.screenshot({path: `${out}/${String(++shotIndex).padStart(2, '0')}-${label}.png`, fullPage: true});
  const started = Date.now();
  try {
    await fn({page, context, shot});
    results.push({name, ok: true, ms: Date.now() - started, errors});
  } catch (e) {
    await shot(`FAILED-${name.replace(/\W+/g, '-')}`).catch(() => {});
    results.push({
      name,
      ok: false,
      ms: Date.now() - started,
      errors,
      failure: e.message.split('\n').slice(0, 3).join(' | '),
    });
  }
  await context.close();
}
async function signIn(page, p) {
  await page.goto(`${base}/auth`);
  await page.locator('input[type=email]').fill(email(p));
  await page.locator('input[type=password]').fill(PASSWORD);
  await page.getByRole('button', {name: /^Sign in$/}).click();
  await waitUrl(page, /\/(today|onboarding)/, {timeout: 30000});
  await page.waitForTimeout(1200);
}
async function createFamily(page, name) {
  await page.locator('#family-name').waitFor({timeout: 30000});
  await page.locator('#family-name').fill(name);
  await page.getByRole('button', {name: 'Create family'}).click();
  await waitUrl(page, /\/family/, {timeout: 30000});
  await page.waitForTimeout(800);
}
async function addBaby(page, {name, nickname, birthday, sex, weeks, days}) {
  if (!page.url().includes('/family')) {
    await page.goto(`${base}/family`);
    await page.waitForTimeout(1000);
  }
  await page
    .getByRole('button', {name: /^Add baby$/})
    .first()
    .click();
  const form = page.locator('#baby-form');
  await form.getByLabel('Name', {exact: true}).fill(name);
  if (nickname) await form.getByLabel(/Nickname/).fill(nickname);
  await form.getByLabel('Date of birth').fill(birthday);
  if (weeks) {
    await form.getByLabel('Gestational weeks at birth').fill(String(weeks));
    await form.getByLabel('Extra days').fill(String(days ?? 0));
  }
  if (sex) await form.getByRole('button', {name: sex === 'female' ? 'Girl' : 'Boy'}).click();
  await form.getByRole('button', {name: /^Add baby$/}).click();
  await page.getByText(/Baby added/).waitFor({timeout: 15000});
}
async function quickLog(page, ml) {
  await page
    .getByRole('button', {name: `Log ${ml} ml`})
    .first()
    .click();
  await page.getByRole('dialog').waitFor();
  await page
    .getByRole('dialog')
    .getByRole('button', {name: /^Save$/})
    .click();
  await page.getByRole('dialog').waitFor({state: 'hidden', timeout: 15000});
}
async function tab(page, name) {
  await page
    .getByRole('navigation', {name: /Main navigation|主导航/})
    .getByRole('button', {name})
    .click();
  await page.waitForTimeout(900);
}
async function openSettings(page) {
  await tab(page, 'Family');
  await page
    .getByRole('button', {name: /Settings/})
    .last()
    .click();
  await page.getByRole('dialog', {name: 'Settings'}).waitFor();
}
const familyCodes = {};

// ---------- scenarios
for (const p of people) await createAccount(p);
console.log(`created ${people.length} accounts (${run})`);

await scenario('1 Emily: sign in, create family, add newborn, quick log', async ({page, shot}) => {
  await signIn(page, people[0]);
  await createFamily(page, 'Emily & James');
  await addBaby(page, {name: 'Noah', birthday: ago(21), sex: 'male'});
  await page.getByText('Family code', {exact: true}).click();
  familyCodes.emily = (
    await page
      .locator('strong', {hasText: /^[A-Z0-9]{10}$/})
      .first()
      .textContent()
  ).trim();
  if (familyCodes.emily.length !== 10) throw new Error('family code not shown');
  await tab(page, 'Today');
  await page.getByText('No feedings yet').waitFor();
  await quickLog(page, 60);
  await page.getByText('Since last feed').waitFor();
  await page.getByText(/Today’s total/).waitFor();
  await shot('emily-today');
});

await scenario('2 James: joins with the family code and sees Noah’s feed', async ({page, shot}) => {
  await signIn(page, people[1]);
  await page.locator('#family-code').waitFor({timeout: 30000});
  await page.locator('#family-code').fill(familyCodes.emily);
  await page.getByRole('button', {name: 'Join family'}).click();
  await waitUrl(page, /\/today/, {timeout: 30000});
  await page.waitForTimeout(1500);
  await page.getByText('Noah').first().waitFor();
  await page.getByText(/by Emily/).waitFor();
  await quickLog(page, 90);
  await tab(page, 'Family');
  await page.getByText('James').waitFor();
  await page.getByText('Emily').waitFor();
  await shot('james-family');
});

await scenario('3 李婷: twins, Chinese UI, per-baby history', async ({page, shot}) => {
  await signIn(page, people[2]);
  await createFamily(page, '李家');
  await addBaby(page, {name: '糯米', birthday: ago(120), sex: 'female'});
  await addBaby(page, {name: '团子', birthday: ago(120), sex: 'male'});
  await openSettings(page);
  await page.getByRole('button', {name: /Language/}).click();
  await page.getByRole('radio', {name: '简体中文'}).click();
  await page.getByRole('button', {name: /关闭|Close/}).click();
  await tab(page, '今天');
  await page.getByRole('tab', {name: /糯米/}).waitFor();
  await page.getByRole('button', {name: '记录 120 ml'}).first().click();
  await page.getByRole('dialog').getByRole('button', {name: '保存记录'}).click();
  await page.getByRole('dialog').waitFor({state: 'hidden'});
  await page.getByRole('tab', {name: /团子/}).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', {name: '记录 150 ml'}).first().click();
  await page.getByRole('dialog').getByRole('button', {name: '保存记录'}).click();
  await page.getByRole('dialog').waitFor({state: 'hidden'});
  await shot('liting-today-zh');
  await tab(page, '记录');
  await page.getByText('当天记录').waitFor();
  await page.getByRole('button', {name: /团子/}).click();
  await page.getByText('150').first().waitFor();
  await shot('liting-history-zh');
});

await scenario('4 Sofia: breastfeeding minutes and mixed feeds', async ({page, shot}) => {
  await signIn(page, people[3]);
  await createFamily(page, 'Casa Sofia');
  await addBaby(page, {name: 'Luca', birthday: ago(45), sex: 'male'});
  await tab(page, 'Today');
  await page.getByRole('button', {name: /Enter amount or time/}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', {name: 'Breast milk'}).click();
  await dialog.getByLabel('Nursing time (minutes)').fill('18');
  await dialog.getByRole('button', {name: /^Save$/}).click();
  await dialog.waitFor({state: 'hidden'});
  await page
    .getByText(/18 min/)
    .first()
    .waitFor();
  await page.getByRole('button', {name: /Enter amount or time/}).click();
  await dialog.getByRole('button', {name: 'Mixed'}).click();
  await dialog.getByRole('button', {name: 'ml'}).click();
  await dialog.getByLabel('Amount (ml)').fill('40');
  await dialog.getByRole('button', {name: /^Save$/}).click();
  await dialog.waitFor({state: 'hidden'});
  await page.getByText(/plus nursing/).waitFor();
  await shot('sofia-today');
});

await scenario('5 Aisha: preterm baby uses corrected age on the growth chart', async ({page, shot}) => {
  await signIn(page, people[4]);
  await createFamily(page, 'Aisha’s family');
  await addBaby(page, {name: 'Zara', birthday: ago(100), sex: 'female', weeks: 34, days: 2});
  await page.getByText(/born at 34\+2/).waitFor();
  await tab(page, 'Growth');
  await page.getByRole('tab', {name: 'Growth chart'}).click();
  await page.getByText('Record growth').click();
  await page.getByLabel(/Weight/).fill('4.2');
  await page.locator('input[type=date]').fill(ago(1));
  await page.getByRole('button', {name: /^Save$/}).click();
  await page.getByText('Growth record saved').waitFor();
  await page
    .getByText(/corrected age/)
    .first()
    .waitFor();
  await shot('aisha-growth-corrected');
});

await scenario('6 王芳: several growth records, percentile, delete one', async ({page, shot}) => {
  await signIn(page, people[5]);
  await createFamily(page, '王家');
  await addBaby(page, {name: '小宝', birthday: ago(183), sex: 'male'});
  await tab(page, 'Growth');
  await page.getByRole('tab', {name: 'Growth chart'}).click();
  await page.getByText('Record growth').click();
  for (const [days, w, l] of [
    [150, 4.6, 55],
    [90, 6.4, 61],
    [30, 7.6, 66],
    [2, 8.0, 68],
  ]) {
    await page.getByLabel(/Weight/).fill(String(w));
    await page.getByLabel(/Length/).fill(String(l));
    await page.locator('input[type=date]').fill(ago(days));
    await page.getByRole('button', {name: /^Save$/}).click();
    await page.getByText('Growth record saved').waitFor();
  }
  await page
    .getByText(/^P\d+$/)
    .first()
    .waitFor();
  await page.getByText(/Since last time/).waitFor();
  await shot('wangfang-growth');
  page.once('dialog', d => d.accept());
  await page
    .getByRole('button', {name: /Delete growth record/})
    .first()
    .click();
  await page.getByText('Growth record deleted').waitFor();
});

await scenario('7 Maria: moments, a first, and a logged visit on the timeline', async ({page, shot}) => {
  await signIn(page, people[6]);
  await createFamily(page, 'Familia Maria');
  await addBaby(page, {name: 'Mateo', birthday: ago(70), sex: 'male'});
  await tab(page, 'Growth');
  await page.getByRole('button', {name: 'Add a moment'}).click();
  const sheet = page.getByRole('dialog', {name: 'New moment'});
  await sheet.getByRole('radio', {name: 'First'}).click();
  await sheet.getByPlaceholder(/e\.g\./).fill('First bath');
  await sheet.locator('input[type=date]').fill(ago(60));
  await sheet.getByRole('button', {name: /^Save$/}).click();
  await sheet.waitFor({state: 'hidden'});
  await page.getByText('First bath').waitFor();
  const visit = page.getByRole('button', {name: /checkup|Vaccines/}).first();
  await visit.click();
  await page
    .getByRole('button', {name: /Log this visit|Log these/})
    .first()
    .click();
  const vs = page.getByRole('dialog', {name: 'Log this visit'});
  await vs.getByRole('button', {name: /^Save/}).click();
  await vs.waitFor({state: 'hidden', timeout: 15000});
  await page
    .getByText(/Checkup|Vaccine/)
    .first()
    .waitFor();
  await shot('maria-timeline');
});

await scenario('8 Hannah: ounces and the Chinese guide region', async ({page, shot}) => {
  await signIn(page, people[7]);
  await createFamily(page, 'Hannah’s family');
  await addBaby(page, {name: 'Ava', birthday: ago(30), sex: 'female'});
  await openSettings(page);
  await page.getByRole('button', {name: /Volume unit/}).click();
  await page.getByRole('radio', {name: /Ounces/}).click();
  await page.getByRole('button', {name: /Health guide region/}).click();
  await page.getByRole('radio', {name: /China/}).click();
  await shot('hannah-settings');
  await page.getByRole('button', {name: 'Close'}).click();
  await tab(page, 'Today');
  await page.getByText(/Quick log · oz/).waitFor();
  await page.getByRole('button', {name: 'Log 3 oz'}).click();
  await page
    .getByRole('dialog')
    .getByRole('button', {name: /^Save$/})
    .click();
  await page.getByRole('dialog').waitFor({state: 'hidden'});
  await page.getByText(/3 oz/).first().waitFor();
  await tab(page, 'Growth');
  await page
    .getByText(/Vaccines at birth/)
    .first()
    .click();
  await page
    .getByText(/卡介苗|BCG|乙肝|Hep ?B/)
    .first()
    .waitFor();
  await shot('hannah-timeline-cn');
});

await scenario('9 Chen: logs offline, syncs when back, exports CSV', async ({page, context, shot}) => {
  await signIn(page, people[8]);
  await createFamily(page, 'Chen family');
  await addBaby(page, {name: 'Kai', birthday: ago(200), sex: 'male'});
  await tab(page, 'Today');
  await quickLog(page, 150);
  await context.setOffline(true);
  await page.getByRole('button', {name: 'Log 180 ml'}).click();
  await page
    .getByRole('dialog')
    .getByRole('button', {name: /^Save$/})
    .click();
  await page.getByText(/waiting to sync/).waitFor({timeout: 10000});
  await shot('chen-offline-pending');
  await context.setOffline(false);
  await page.getByText(/waiting to sync/).waitFor({state: 'hidden', timeout: 40000});
  await page.getByText(/Feeds today/).waitFor();
  await openSettings(page);
  await page.getByRole('button', {name: /Export data/}).click();
  const [download] = await Promise.all([
    page.waitForEvent('download', {timeout: 15000}),
    page.getByRole('button', {name: /^Feedings$/}).click(),
  ]);
  if (!/\.csv$/.test(download.suggestedFilename())) throw new Error('export was not a CSV');
  await page.getByText(/Exported 2 feeding records/).waitFor();
});

await scenario('10 Olivia: deletes her account; sign-in no longer works', async ({page, shot}) => {
  await signIn(page, people[9]);
  await createFamily(page, 'Olivia');
  await addBaby(page, {name: 'Ella', birthday: ago(10), sex: 'female'});
  await openSettings(page);
  await page.getByRole('button', {name: 'Delete account'}).click();
  await shot('olivia-delete-confirm');
  await page.getByRole('button', {name: 'Delete permanently'}).click();
  await waitUrl(page, /\/auth/, {timeout: 30000});
  await page.locator('input[type=email]').fill(email(people[9]));
  await page.locator('input[type=password]').fill(PASSWORD);
  await page.getByRole('button', {name: /^Sign in$/}).click();
  await page.getByText(/Invalid login credentials/).waitFor({timeout: 15000});
});

await browser.close();

// ---------- cleanup + report
if (process.env.KEEP !== '1') {
  for (const p of people.slice(0, 9)) console.log(`cleanup ${p.key}: ${await deleteAccount(p)}`);
} else console.log('KEEP=1: test accounts left in place');
console.log('\nScenario results');
for (const r of results) {
  console.log(
    `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  (${(r.ms / 1000).toFixed(1)}s)${r.failure ? `\n      ${r.failure}` : ''}${r.errors.length ? `\n      console/page errors: ${r.errors.slice(0, 3).join(' | ')}` : ''}`,
  );
}
process.exit(results.every(r => r.ok) ? 0 : 1);
