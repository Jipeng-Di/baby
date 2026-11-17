'use client';
import type {Dispatch, SetStateAction} from 'react';
import {X} from 'lucide-react';
import {babyName, type Baby, type BabyEvent} from '@/lib/types';
import {tr} from '@/lib/i18n';
import {diaperLabel, diaperTypes, eventKinds, eventLabel, type EventForm} from '@/lib/events';
import {temperatureUnit, useGrowthUnit} from '@/lib/growth-units';
import DateTimeWheel from './DateTimeWheel';
import {EventBadge, eventIcon, eventTone} from './event-ui';
import {Alert, input, primary} from './ui';

type Props = {
  form: EventForm;
  setForm: Dispatch<SetStateAction<EventForm | null>>;
  /** The event being edited, or undefined for a new one. */
  editing: BabyEvent | undefined;
  babies: Baby[];
  busy: boolean;
  error: string;
  recorderName: (userId: string) => string;
  onSave: () => void;
  onDelete: () => void;
};

const pill = (on: boolean) =>
  `min-h-12 rounded-2xl border text-sm font-semibold transition ${on ? 'border-(--brand) bg-(--brand-pale) text-(--brand)' : 'border-(--line) bg-(--surface) text-(--muted)'}`;

/** Bottom sheet for logging or editing sleep, a diaper, tummy time, a bath, medicine or a temperature. */
export default function EventSheet({
  form,
  setForm,
  editing,
  babies,
  busy,
  error,
  recorderName,
  onSave,
  onDelete,
}: Props) {
  useGrowthUnit();
  const set = (patch: Partial<EventForm>) => setForm(current => (current ? {...current, ...patch} : current));
  const close = () => !busy && setForm(null);
  const baby = babies.find(b => b.id === form.baby_id);
  const kind = form.kind;
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[#10231b]/40"
      onMouseDown={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? tr('编辑记录', 'Edit record') : tr('记录日常', 'Log activity')}
        className="safe-bottom max-h-[94dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[32px] bg-(--surface-2) p-5 shadow-2xl"
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-(--line)" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <EventBadge kind={kind} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm text-(--brand)">
                {editing
                  ? tr(
                      `编辑 · ${recorderName(editing.created_by)}记录`,
                      `Edit · logged by ${recorderName(editing.created_by)}`,
                    )
                  : baby
                    ? babyName(baby)
                    : ''}
              </p>
              <h2 className="text-2xl font-semibold">{eventLabel[kind]()}</h2>
            </div>
          </div>
          <button
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--chip)"
            aria-label={tr('关闭', 'Close')}
            onClick={close}
            disabled={busy}
          >
            <X size={20} />
          </button>
        </div>
        {error && <Alert text={error} />}
        <div className="mt-5 space-y-5">
          {!editing && (
            <div className="grid grid-cols-3 gap-2" role="group" aria-label={tr('记录类型', 'Record type')}>
              {eventKinds.map(k => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-semibold transition ${kind === k ? `border-current ${eventTone[k].pale} ${eventTone[k].text}` : 'border-(--line) bg-(--surface) text-(--muted)'}`}
                  onClick={() => set({kind: k})}
                >
                  {eventIcon[k]({size: 20})}
                  {eventLabel[k]()}
                </button>
              ))}
            </div>
          )}

          {kind === 'sleep' && (
            <>
              <div
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-label={tr('睡眠状态', 'Sleep status')}
              >
                <button
                  type="button"
                  aria-pressed={form.ongoing}
                  className={pill(form.ongoing)}
                  onClick={() => set({ongoing: true})}
                >
                  {tr('正在睡', 'Still asleep')}
                </button>
                <button
                  type="button"
                  aria-pressed={!form.ongoing}
                  className={pill(!form.ongoing)}
                  onClick={() => set({ongoing: false})}
                >
                  {tr('已经醒了', 'Woke up')}
                </button>
              </div>
              <div className="text-sm font-medium">
                {tr('入睡时间', 'Fell asleep')}
                <DateTimeWheel value={form.started_at} onChange={v => set({started_at: v})} />
              </div>
              {!form.ongoing && (
                <div className="text-sm font-medium">
                  {tr('醒来时间', 'Woke up')}
                  <DateTimeWheel value={form.ended_at} onChange={v => set({ended_at: v})} />
                </div>
              )}
              {form.ongoing && (
                <p className="-mt-2 text-xs leading-relaxed text-(--soft)">
                  {tr(
                    '保存后首页会显示睡眠计时，醒来时点一下“醒了”即可。',
                    'Today will show a sleep timer. Tap “Woke up” there when the baby wakes.',
                  )}
                </p>
              )}
            </>
          )}

          {kind === 'diaper' && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{tr('尿布情况', 'What was in it')}</legend>
              <div className="grid grid-cols-3 gap-2">
                {diaperTypes.map(t => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={form.diaper === t}
                    className={pill(form.diaper === t)}
                    onClick={() => set({diaper: t})}
                  >
                    {diaperLabel[t]()}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {kind === 'tummy' && (
            <div className="text-sm font-medium">
              {tr('时长 · 分钟', 'Duration · min')}
              <div className="mt-2 flex gap-2">
                <input
                  className={`${input} min-w-0 flex-1 font-semibold`}
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="done"
                  aria-label={tr('时长（分钟）', 'Duration (minutes)')}
                  min={1}
                  max={240}
                  step={1}
                  placeholder="10"
                  value={form.duration}
                  onChange={e => set({duration: e.target.value})}
                />
                {[5, 10, 15].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`${pill(form.duration === String(n))} w-14 shrink-0`}
                    onClick={() => set({duration: String(n)})}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {kind === 'temperature' && (
            <label className="block text-sm font-medium">
              {tr(`体温 · ${temperatureUnit()}`, `Temperature · ${temperatureUnit()}`)}
              <input
                className={`${input} mt-2 font-semibold`}
                style={{fontSize: '24px'}}
                type="number"
                inputMode="decimal"
                enterKeyHint="done"
                step={0.1}
                placeholder={temperatureUnit() === '°F' ? '98.6' : '36.8'}
                value={form.temperature}
                onChange={e => set({temperature: e.target.value})}
              />
            </label>
          )}

          {kind === 'medicine' && (
            <label className="block text-sm font-medium">
              {tr('药名和剂量', 'Medicine and dose')}
              <input
                className={`${input} mt-2`}
                maxLength={500}
                placeholder={tr('例如：维生素 D 400 IU', 'e.g. Vitamin D 400 IU')}
                value={form.note}
                onChange={e => set({note: e.target.value})}
              />
            </label>
          )}

          {kind !== 'sleep' && (
            <div className="text-sm font-medium">
              {kind === 'tummy' ? tr('开始时间', 'Started') : tr('时间', 'Time')}
              <DateTimeWheel value={form.started_at} onChange={v => set({started_at: v})} />
            </div>
          )}

          {kind !== 'medicine' && (
            <label className="block text-sm font-medium">
              {tr('备注（可选）', 'Note (optional)')}
              <input
                className={`${input} mt-2`}
                maxLength={500}
                value={form.note}
                onChange={e => set({note: e.target.value})}
              />
            </label>
          )}
        </div>
        <button className={`${primary} mt-6`} disabled={busy} onClick={onSave}>
          {busy ? tr('保存中…', 'Saving…') : tr('保存记录', 'Save')}
        </button>
        {editing && (
          <button className="mt-3 min-h-12 w-full text-(--danger)" disabled={busy} onClick={onDelete}>
            {tr('删除这条记录', 'Delete this record')}
          </button>
        )}
      </div>
    </div>
  );
}
