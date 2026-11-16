// Fills in the App Store listing through the App Store Connect API and submits the version for review.
// The listing text is read from docs/app-store.md, so that file stays the single source of truth.
//
//   node --env-file=.env.local scripts/asc.mjs <step>
//
// Steps (each is safe to re-run):
//   status       read-only overview of the app, version, build and what is still missing
//   info         categories, content rights, subtitle/privacy URL (en-US + zh-Hans), age rating
//   listing      version text for en-US and zh-Hans, copyright
//   screenshots  replace the 6.9" iPhone screenshots with screens/appstore/{en,zh}-*.png
//   pricing      free, available everywhere except mainland China (needs an ICP filing)
//   review       App Review contact + demo account + notes
//   build        attach the newest processed build of this version
//   submit       create a review submission and submit it
//   all          info, listing, screenshots, pricing, review, build (not submit)
//
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH (the .p8 file), DEMO_EMAIL, DEMO_PASSWORD,
//      REVIEW_FIRST_NAME, REVIEW_LAST_NAME, REVIEW_PHONE, REVIEW_EMAIL.
import {createHash, createPrivateKey, sign} from 'node:crypto';
import {readFileSync, readdirSync, statSync} from 'node:fs';

const BUNDLE_ID = 'com.jipengdi.feedbook';
const VERSION = '1.0.0';
const SITE = 'https://baby-feeding-three.vercel.app';
const env = name => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
};

// ---------- listing text from docs/app-store.md
const doc = readFileSync(new URL('../docs/app-store.md', import.meta.url), 'utf8').split('\n');
function quote(heading, label) {
  let i = doc.findIndex(l => l.startsWith(heading));
  if (i < 0) throw new Error(`docs/app-store.md: no heading ${heading}`);
  i = doc.findIndex((l, j) => j > i && l.startsWith(label));
  if (i < 0) throw new Error(`docs/app-store.md: no "${label}" under ${heading}`);
  while (!doc[i].startsWith('>')) i++;
  const out = [];
  for (; i < doc.length && doc[i].startsWith('>'); i++) out.push(doc[i].replace(/^> ?/, ''));
  return out.join('\n').trim();
}
const row = name => {
  const line = doc.find(l => l.startsWith(`| ${name} |`));
  if (!line) throw new Error(`docs/app-store.md: no table row ${name}`);
  return line.split('|')[2].trim();
};
const locales = {
  'en-US': {
    name: row('Name'),
    subtitle: row('Subtitle (en)'),
    promotionalText: quote('## Description (English)', 'Promotional text'),
    description: quote('## Description (English)', 'Description:'),
    keywords: quote('## Description (English)', 'Keywords'),
    shots: 'en',
  },
  'zh-Hans': {
    name: 'Feedbook 宝宝喂奶记录',
    subtitle: row('Subtitle (zh-Hans)'),
    promotionalText: quote('## Description (简体中文)', '推广文本'),
    description: quote('## Description (简体中文)', '描述'),
    keywords: quote('## Description (简体中文)', '关键词'),
    shots: 'zh',
  },
};
const reviewNotes = quote('## App Review information', 'Notes for the reviewer');

// ---------- API client
const key = createPrivateKey(readFileSync(env('ASC_KEY_PATH')));
const b64 = x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({alg: 'ES256', kid: env('ASC_KEY_ID'), typ: 'JWT'});
  const body = b64({iss: env('ASC_ISSUER_ID'), iat: now, exp: now + 1100, aud: 'appstoreconnect-v1'});
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), {key, dsaEncoding: 'ieee-p1363'});
  return `${head}.${body}.${sig.toString('base64url')}`;
}
async function api(method, path, body) {
  const res = await fetch(path.startsWith('http') ? path : `https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: {Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json'},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(
      `${method} ${path} → ${res.status}: ${(json?.errors ?? []).map(e => `${e.title}: ${e.detail}${e.source?.pointer ? ` (${e.source.pointer})` : ''}`).join(' | ') || text}`,
    );
    err.errors = json?.errors ?? [];
    throw err;
  }
  return json;
}
const get = p => api('GET', p);
const rel = (type, id) => ({data: {type, id}});
/** PATCH that drops attributes this API version doesn't know and tries again. */
async function patchLenient(type, id, path, attributes) {
  const attrs = {...attributes};
  for (let i = 0; i < 20; i++) {
    try {
      return await api('PATCH', path, {data: {type, id, attributes: attrs}});
    } catch (e) {
      const bad = e.errors
        .map(x => x.source?.pointer?.match(/attributes\/(\w+)/)?.[1])
        .filter(n => n && n in attrs);
      if (!bad.length) throw e;
      for (const n of bad) delete attrs[n];
      console.log(`  (skipped unsupported: ${bad.join(', ')})`);
    }
  }
}

// ---------- lookups
const app = (await get(`/v1/apps?filter[bundleId]=${BUNDLE_ID}`)).data[0];
if (!app) throw new Error(`No App Store Connect app for ${BUNDLE_ID}`);
async function editableVersion() {
  const {data} = await get(`/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=10`);
  const v = data.find(x => x.attributes.versionString === VERSION) ?? data[0];
  if (!v) throw new Error('No App Store version');
  return v;
}
async function editableAppInfo() {
  const {data} = await get(`/v1/apps/${app.id}/appInfos`);
  return (
    data.find(i => !['READY_FOR_DISTRIBUTION', 'REPLACED_WITH_NEW_INFO'].includes(i.attributes.state)) ??
    data[0]
  );
}

// ---------- steps
async function status() {
  const v = await editableVersion();
  const info = await editableAppInfo();
  const vLocs = (await get(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`)).data;
  const iLocs = (await get(`/v1/appInfos/${info.id}/appInfoLocalizations`)).data;
  const builds = (await get(`/v1/builds?filter[app]=${app.id}&sort=-uploadedDate&limit=5`)).data;
  const attached = (await get(`/v1/appStoreVersions/${v.id}/build`)).data;
  console.log(`App ${app.attributes.name} (${app.id}), primary locale ${app.attributes.primaryLocale}`);
  console.log(
    `Version ${v.attributes.versionString}: ${v.attributes.appStoreState ?? v.attributes.appVersionState}`,
  );
  console.log(`App info state: ${info.attributes.state ?? info.attributes.appStoreState}`);
  for (const l of iLocs)
    console.log(`  info ${l.attributes.locale}: ${l.attributes.name} / ${l.attributes.subtitle ?? '-'}`);
  for (const l of vLocs)
    console.log(
      `  version ${l.attributes.locale}: description ${l.attributes.description ? 'set' : 'MISSING'}`,
    );
  for (const b of builds)
    console.log(
      `  build ${b.attributes.version}: ${b.attributes.processingState} (uploaded ${b.attributes.uploadedDate})`,
    );
  console.log(`  attached build: ${attached ? attached.attributes.version : 'none'}`);
}

async function info() {
  await patchLenient('apps', app.id, `/v1/apps/${app.id}`, {
    contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT',
  });
  const appInfo = await editableAppInfo();
  await api('PATCH', `/v1/appInfos/${appInfo.id}`, {
    data: {
      type: 'appInfos',
      id: appInfo.id,
      relationships: {
        primaryCategory: rel('appCategories', 'HEALTH_AND_FITNESS'),
        secondaryCategory: rel('appCategories', 'LIFESTYLE'),
      },
    },
  });
  const existing = (await get(`/v1/appInfos/${appInfo.id}/appInfoLocalizations`)).data;
  for (const [locale, t] of Object.entries(locales)) {
    const attrs = {name: t.name, subtitle: t.subtitle, privacyPolicyUrl: `${SITE}/privacy`};
    const found = existing.find(l => l.attributes.locale === locale);
    if (found) {
      if (locale === 'en-US') delete attrs.name; // keep the name chosen when the app was created
      await api('PATCH', `/v1/appInfoLocalizations/${found.id}`, {
        data: {type: 'appInfoLocalizations', id: found.id, attributes: attrs},
      });
    } else
      await api('POST', '/v1/appInfoLocalizations', {
        data: {
          type: 'appInfoLocalizations',
          attributes: {locale, ...attrs},
          relationships: {appInfo: rel('appInfos', appInfo.id)},
        },
      });
    console.log(`  app info ${locale}: ok`);
  }
  // Age rating: nothing objectionable. The growth guide carries general health information (vaccine
  // schedules, when to call a doctor), declared honestly as infrequent/mild medical information.
  const decl = (await get(`/v1/appInfos/${appInfo.id}/ageRatingDeclaration`)).data;
  const none = [
    'alcoholTobaccoOrDrugUseOrReferences',
    'contests',
    'gamblingSimulated',
    'gunsOrOtherWeapons',
    'horrorOrFearThemes',
    'matureOrSuggestiveThemes',
    'profanityOrCrudeHumor',
    'sexualContentGraphicAndNudity',
    'sexualContentOrNudity',
    'violenceCartoonOrFantasy',
    'violenceRealistic',
    'violenceRealisticProlongedGraphicOrSadistic',
  ];
  const no = [
    'gambling',
    'lootBox',
    'unrestrictedWebAccess',
    'messagingAndChat',
    'userGeneratedContent',
    'parentalControls',
    'ageAssurance',
    'advertising',
  ];
  await patchLenient('ageRatingDeclarations', decl.id, `/v1/ageRatingDeclarations/${decl.id}`, {
    ...Object.fromEntries(none.map(k => [k, 'NONE'])),
    ...Object.fromEntries(no.map(k => [k, false])),
    medicalOrTreatmentInformation: 'INFREQUENT_OR_MILD',
    healthOrWellnessTopics: true,
  });
  console.log('  age rating: ok');
}

async function listing() {
  const v = await editableVersion();
  await api('PATCH', `/v1/appStoreVersions/${v.id}`, {
    data: {type: 'appStoreVersions', id: v.id, attributes: {copyright: row('Copyright')}},
  });
  const existing = (await get(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`)).data;
  for (const [locale, t] of Object.entries(locales)) {
    const attrs = {
      description: t.description,
      keywords: t.keywords,
      promotionalText: t.promotionalText,
      supportUrl: `${SITE}/support`,
      marketingUrl: SITE,
    };
    const found = existing.find(l => l.attributes.locale === locale);
    if (found)
      await api('PATCH', `/v1/appStoreVersionLocalizations/${found.id}`, {
        data: {type: 'appStoreVersionLocalizations', id: found.id, attributes: attrs},
      });
    else
      await api('POST', '/v1/appStoreVersionLocalizations', {
        data: {
          type: 'appStoreVersionLocalizations',
          attributes: {locale, ...attrs},
          relationships: {appStoreVersion: rel('appStoreVersions', v.id)},
        },
      });
    console.log(`  listing ${locale}: ok`);
  }
}

async function screenshots() {
  const v = await editableVersion();
  const locs = (await get(`/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations`)).data;
  const dir = new URL('../screens/appstore/', import.meta.url);
  for (const [locale, t] of Object.entries(locales)) {
    const loc = locs.find(l => l.attributes.locale === locale);
    if (!loc) throw new Error(`Run "listing" first: no ${locale} localization`);
    const files = readdirSync(dir)
      .filter(f => f.startsWith(`${t.shots}-`) && f.endsWith('.png'))
      .sort();
    if (!files.length) throw new Error(`No screenshots for ${locale} in screens/appstore`);
    const sets = (await get(`/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`)).data;
    let set = sets.find(s => s.attributes.screenshotDisplayType === 'APP_IPHONE_67');
    if (set) {
      for (const old of (await get(`/v1/appScreenshotSets/${set.id}/appScreenshots`)).data)
        await api('DELETE', `/v1/appScreenshots/${old.id}`);
    } else
      set = (
        await api('POST', '/v1/appScreenshotSets', {
          data: {
            type: 'appScreenshotSets',
            attributes: {screenshotDisplayType: 'APP_IPHONE_67'},
            relationships: {appStoreVersionLocalization: rel('appStoreVersionLocalizations', loc.id)},
          },
        })
      ).data;
    for (const file of files) {
      const bytes = readFileSync(new URL(file, dir));
      const shot = (
        await api('POST', '/v1/appScreenshots', {
          data: {
            type: 'appScreenshots',
            attributes: {fileName: file, fileSize: statSync(new URL(file, dir)).size},
            relationships: {appScreenshotSet: rel('appScreenshotSets', set.id)},
          },
        })
      ).data;
      for (const op of shot.attributes.uploadOperations) {
        const res = await fetch(op.url, {
          method: op.method,
          headers: Object.fromEntries(op.requestHeaders.map(h => [h.name, h.value])),
          body: bytes.subarray(op.offset, op.offset + op.length),
        });
        if (!res.ok) throw new Error(`upload ${file}: ${res.status} ${await res.text()}`);
      }
      await api('PATCH', `/v1/appScreenshots/${shot.id}`, {
        data: {
          type: 'appScreenshots',
          id: shot.id,
          attributes: {uploaded: true, sourceFileChecksum: createHash('md5').update(bytes).digest('hex')},
        },
      });
      console.log(`  ${locale} ${file}: uploaded`);
    }
  }
}

async function pricing() {
  const schedule = await get(`/v1/apps/${app.id}/appPriceSchedule`).catch(() => null);
  if (schedule?.data) console.log('  price schedule already set, leaving it');
  else {
    const points = (await get(`/v1/apps/${app.id}/appPricePoints?filter[territory]=USA&limit=200`)).data;
    const free = points.find(p => Number(p.attributes.customerPrice) === 0);
    if (!free) throw new Error('No free price point');
    await api('POST', '/v1/appPriceSchedules', {
      data: {
        type: 'appPriceSchedules',
        relationships: {
          app: rel('apps', app.id),
          baseTerritory: rel('territories', 'USA'),
          manualPrices: {data: [{type: 'appPrices', id: '${free}'}]},
        },
      },
      included: [
        {
          type: 'appPrices',
          id: '${free}',
          attributes: {startDate: null},
          relationships: {appPricePoint: rel('appPricePoints', free.id)},
        },
      ],
    });
    console.log('  price: free');
  }
  const availability = await get(`/v1/apps/${app.id}/appAvailabilityV2`).catch(() => null);
  if (availability?.data) {
    console.log('  availability already set, leaving it');
    return;
  }
  const territories = (await get('/v1/territories?limit=200')).data.map(t => t.id);
  await api('POST', '/v2/appAvailabilities', {
    data: {
      type: 'appAvailabilities',
      attributes: {availableInNewTerritories: true},
      relationships: {
        app: rel('apps', app.id),
        territoryAvailabilities: {
          data: territories.map(id => ({type: 'territoryAvailabilities', id: `\${${id}}`})),
        },
      },
    },
    included: territories.map(id => ({
      type: 'territoryAvailabilities',
      id: `\${${id}}`,
      attributes: {available: id !== 'CHN', releaseDate: null, preOrderEnabled: false},
      relationships: {territory: rel('territories', id)},
    })),
  });
  console.log(`  availability: ${territories.length - 1} territories (mainland China excluded)`);
}

async function review() {
  const v = await editableVersion();
  const attrs = {
    contactFirstName: env('REVIEW_FIRST_NAME'),
    contactLastName: env('REVIEW_LAST_NAME'),
    contactPhone: env('REVIEW_PHONE'),
    contactEmail: env('REVIEW_EMAIL'),
    demoAccountRequired: true,
    demoAccountName: env('DEMO_EMAIL'),
    demoAccountPassword: env('DEMO_PASSWORD'),
    notes: reviewNotes,
  };
  const existing = await get(`/v1/appStoreVersions/${v.id}/appStoreReviewDetail`).catch(() => null);
  if (existing?.data)
    await api('PATCH', `/v1/appStoreReviewDetails/${existing.data.id}`, {
      data: {type: 'appStoreReviewDetails', id: existing.data.id, attributes: attrs},
    });
  else
    await api('POST', '/v1/appStoreReviewDetails', {
      data: {
        type: 'appStoreReviewDetails',
        attributes: attrs,
        relationships: {appStoreVersion: rel('appStoreVersions', v.id)},
      },
    });
  console.log('  review details: ok');
}

async function build() {
  const v = await editableVersion();
  const builds = (
    await get(
      `/v1/builds?filter[app]=${app.id}&filter[preReleaseVersion.version]=${VERSION}&sort=-uploadedDate&limit=10`,
    )
  ).data;
  const ready = builds.find(b => b.attributes.processingState === 'VALID');
  if (!ready)
    throw new Error(
      `No processed build yet (${builds.map(b => `${b.attributes.version}: ${b.attributes.processingState}`).join(', ') || 'none uploaded'})`,
    );
  await api('PATCH', `/v1/appStoreVersions/${v.id}/relationships/build`, {
    data: {type: 'builds', id: ready.id},
  });
  console.log(`  build ${ready.attributes.version} attached`);
}

async function submit() {
  const v = await editableVersion();
  const open = (
    await get(`/v1/reviewSubmissions?filter[app]=${app.id}&filter[state]=READY_FOR_REVIEW,UNRESOLVED_ISSUES`)
  ).data;
  const submission =
    open[0] ??
    (
      await api('POST', '/v1/reviewSubmissions', {
        data: {
          type: 'reviewSubmissions',
          attributes: {platform: 'IOS'},
          relationships: {app: rel('apps', app.id)},
        },
      })
    ).data;
  const items = (await get(`/v1/reviewSubmissions/${submission.id}/items`)).data;
  if (!items.length)
    await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: rel('reviewSubmissions', submission.id),
          appStoreVersion: rel('appStoreVersions', v.id),
        },
      },
    });
  await api('PATCH', `/v1/reviewSubmissions/${submission.id}`, {
    data: {type: 'reviewSubmissions', id: submission.id, attributes: {submitted: true}},
  });
  console.log('  submitted for review');
}

const steps = {status, info, listing, screenshots, pricing, review, build, submit};
const step = process.argv[2] ?? 'status';
const run = step === 'all' ? ['info', 'listing', 'screenshots', 'pricing', 'review', 'build'] : [step];
for (const s of run) {
  if (!steps[s]) throw new Error(`Unknown step ${s}`);
  console.log(`== ${s}`);
  await steps[s]();
}
