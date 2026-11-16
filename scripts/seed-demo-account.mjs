// Creates (or re-creates) the App Review demo family: two parents and a four-month-old with two weeks of
// feeds, growth records and a few moments, so every screen has something to show.
//
// Usage:
//   DEMO_EMAIL=... DEMO_PASSWORD=... PARTNER_EMAIL=... node --env-file=.env.local scripts/seed-demo-account.mjs
//
// Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (accounts are
// created pre-confirmed through the admin API). Records are inserted as the signed-in parents so the
// database's recorder checks apply exactly as in the app. Running it again wipes and rebuilds both accounts,
// which also moves the data forward to "now".
import {createClient} from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const {DEMO_EMAIL, DEMO_PASSWORD, PARTNER_EMAIL} = process.env;
if (!url || !anon || !service) throw new Error('Missing Supabase env vars (service role key required)');
if (!DEMO_EMAIL || !DEMO_PASSWORD || !PARTNER_EMAIL)
  throw new Error('Set DEMO_EMAIL, DEMO_PASSWORD, PARTNER_EMAIL');

const admin = createClient(url, service, {auth: {persistSession: false}});
const check = (what, {error}) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

async function signedIn(email, name) {
  const {data: list} = await admin.auth.admin.listUsers({perPage: 1000});
  const old = list.users.find(u => u.email === email);
  if (old) {
    const sb = createClient(url, anon, {auth: {persistSession: false}});
    check('old sign-in', await sb.auth.signInWithPassword({email, password: DEMO_PASSWORD}));
    check('delete old account', await sb.rpc('delete_account'));
  }
  check(
    `create ${email}`,
    await admin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {display_name: name},
    }),
  );
  const sb = createClient(url, anon, {auth: {persistSession: false}});
  const {data, error} = await sb.auth.signInWithPassword({email, password: DEMO_PASSWORD});
  if (error) throw error;
  check('profile', await sb.from('profiles').upsert({id: data.user.id, display_name: name}));
  return {sb, id: data.user.id};
}

const day = 86400000;
const now = Date.now();
const date = daysAgo => new Date(now - daysAgo * day).toISOString().slice(0, 10);
// Deterministic jitter so re-seeding gives the same-looking data.
let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Partner first: delete_account on the owner would otherwise hand the family to a stale partner.
const partner = await signedIn(PARTNER_EMAIL, 'Alex');
const parent = await signedIn(DEMO_EMAIL, 'Sam');

const {data: familyId, error: famErr} = await parent.sb.rpc('create_family', {
  family_name: 'The Rivera family',
});
if (famErr) throw famErr;
const {data: fam} = await parent.sb.from('families').select('family_code').eq('id', familyId).single();
check('partner joins', await partner.sb.rpc('join_family_by_code', {input_code: fam.family_code}));

const {data: baby, error: babyErr} = await parent.sb
  .from('babies')
  .insert({family_id: familyId, name: 'Mia', nickname: 'Mimi', birthday: date(124), sex: 'female'})
  .select('id')
  .single();
if (babyErr) throw babyErr;
const base = {baby_id: baby.id, family_id: familyId};

// Two weeks of feeds roughly every three hours; nights are a little longer. Mostly formula with some
// nursing sessions logged in minutes. The last feed is under an hour ago.
const feeds = {parent: [], partner: []};
for (let t = now - 14 * day; t < now - 50 * 60000;) {
  const hour = new Date(t).getHours();
  const night = hour >= 23 || hour < 6;
  const nursing = rand() < 0.22;
  const row = {
    ...base,
    fed_at: new Date(t).toISOString(),
    feeding_type: nursing ? 'breast_milk' : rand() < 0.15 ? 'mixed' : 'formula',
    amount_ml: nursing ? null : Math.round((120 + rand() * 60) / 10) * 10,
    duration_min: nursing ? 10 + Math.round(rand() * 12) : null,
    note: rand() < 0.04 ? 'Fussy, took a break halfway' : null,
  };
  const by = rand() < 0.6 ? 'parent' : 'partner';
  feeds[by].push({...row, created_by: by === 'parent' ? parent.id : partner.id});
  t += (night ? 3.6 : 2.9) * 3600000 + rand() * 40 * 60000;
}
// Always end with a bottle about 45 minutes ago so "Since last feed" looks like a calm, normal day.
const last = Math.max(...[...feeds.parent, ...feeds.partner].map(f => Date.parse(f.fed_at)));
if (now - last > 90 * 60000)
  feeds.parent.push({
    ...base,
    created_by: parent.id,
    fed_at: new Date(now - 45 * 60000).toISOString(),
    feeding_type: 'formula',
    amount_ml: 150,
    duration_min: null,
    note: null,
  });
check('parent feeds', await parent.sb.from('feedings').insert(feeds.parent));
check('partner feeds', await partner.sb.from('feedings').insert(feeds.partner));

const growth = [
  [124, 3.3, 50.2, 34.4, 'Birth'],
  [110, 3.9, 53.0, 36.1, null],
  [93, 4.6, 55.4, 37.5, '1-month checkup'],
  [62, 5.5, 58.6, 39.0, '2-month checkup'],
  [30, 6.2, 61.2, 40.2, null],
  [3, 6.8, 63.4, 41.0, '4-month checkup'],
].map(([ago, weight_kg, length_cm, head_cm, note]) => ({
  ...base,
  recorded_by: parent.id,
  measured_at: date(ago),
  weight_kg,
  length_cm,
  head_cm,
  note,
}));
check('growth', await parent.sb.from('growth_measurements').insert(growth));

const moments = [
  [118, 'first', 'First bath', 'Cried, then loved it.'],
  [80, 'milestone', 'First real smile', 'At Alex, during the morning feed.'],
  [62, 'vaccine', '2-month vaccines', 'A little sleepy afterwards.'],
  [62, 'checkup', '2-month checkup', 'Growing well.'],
  [20, 'first', 'Rolled over', 'Tummy to back on the play mat.'],
  [3, 'vaccine', '4-month vaccines', null],
].map(([ago, kind, title, note]) => ({
  ...base,
  recorded_by: parent.id,
  occurred_on: date(ago),
  kind,
  title,
  note,
}));
check('moments', await parent.sb.from('baby_moments').insert(moments));

console.log(
  `Seeded "The Rivera family": ${feeds.parent.length + feeds.partner.length} feeds, ${growth.length} growth records, ${moments.length} moments.`,
);
