'use client';
import {useState} from 'react';
import {tr} from '@/lib/i18n';
import {Alert, card, input, primary} from './ui';

type Props = {
  error: string;
  success: string;
  busy: boolean;
  /** Each resolves true on success so the field can be cleared. */
  onCreate: (name: string) => Promise<boolean>;
  onJoin: (code: string) => Promise<boolean>;
};

/** Shown to a signed-in user who isn't in a family yet: create one or join with a code. */
export default function Onboarding({error, success, busy, onCreate, onJoin}: Props) {
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  async function create() {
    if (await onCreate(familyName)) setFamilyName('');
  }
  async function join() {
    if (await onJoin(familyCode)) setFamilyCode('');
  }
  return (
    <main className="mx-auto min-h-screen max-w-lg p-6 pb-16">
      <div className="pt-12">
        <img src="/icon.svg" alt="" className="h-12 w-12 rounded-[14px]" />
        <p className="mt-7 text-sm font-semibold tracking-[.2em] text-(--brand)">
          {tr('欢迎来到 Feedbook', 'Welcome to Feedbook')}
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">
          {tr('绑定你的家庭，', 'Link your family,')}
          <br />
          {tr('一起记录每一顿奶。', 'and log every feed together.')}
        </h1>
        <p className="mt-4 text-(--muted)">
          {tr(
            '每个账号绑定一个家庭。你可以创建新家庭，或使用家人分享的唯一编码加入。',
            'Each account belongs to one family. Create a new family, or join one with the code a family member shares.',
          )}
        </p>
      </div>
      {error && <Alert text={error} />} {success && <Alert text={success} good />}
      <section className={`${card} mt-10`}>
        <p className="mb-4 text-sm font-semibold text-(--brand)">{tr('创建新家庭', 'Create a family')}</p>
        <label className="mb-2 block font-medium" htmlFor="family-name">
          {tr('家庭名称', 'Family name')}
        </label>
        <input
          id="family-name"
          className={input}
          placeholder={tr('例如 Di Family', 'e.g. Di Family')}
          value={familyName}
          onChange={e => setFamilyName(e.target.value)}
          maxLength={100}
        />
        <button className={`${primary} mt-4`} disabled={busy || !familyName.trim()} onClick={create}>
          {busy ? tr('处理中…', 'Working…') : tr('创建并绑定家庭', 'Create family')}
        </button>
      </section>
      <div className="my-5 flex items-center gap-3 text-sm text-(--soft)">
        <span className="h-px flex-1 bg-(--line)" />
        <span>{tr('或者', 'or')}</span>
        <span className="h-px flex-1 bg-(--line)" />
      </div>
      <section className={card}>
        <p className="mb-4 text-sm font-semibold text-(--brand)">{tr('加入已有家庭', 'Join a family')}</p>
        <label className="mb-2 block font-medium" htmlFor="family-code">
          {tr('家庭编码', 'Family code')}
        </label>
        <input
          id="family-code"
          className={`${input} uppercase tracking-[.18em]`}
          placeholder={tr('10 位家庭编码', '10-character family code')}
          value={familyCode}
          onChange={e =>
            setFamilyCode(
              e.target.value
                .replace(/[^a-z0-9]/gi, '')
                .toUpperCase()
                .slice(0, 10),
            )
          }
          maxLength={10}
          autoCapitalize="characters"
          autoComplete="off"
        />
        <button className={`${primary} mt-4`} disabled={busy || familyCode.length !== 10} onClick={join}>
          {busy ? tr('正在绑定…', 'Joining…') : tr('绑定已有家庭', 'Join family')}
        </button>
      </section>
    </main>
  );
}
