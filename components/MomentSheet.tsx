'use client';
import {useRef} from 'react';
import {ImagePlus, Trash2, X} from 'lucide-react';
import {Alert} from './ui';
import {KIND, KindBadge, SourceLink} from './timeline-ui';
import {guideItem, say} from '@/lib/guide';
import {ageWindowLabel, type MomentForm} from '@/lib/timeline';
import {tr} from '@/lib/i18n';
import {babyName, type Baby, type Moment, type MomentKind} from '@/lib/types';

export type MomentDraft = {
  baby: Baby;
  form: MomentForm;
  editing: Moment | null;
  /** A newly picked photo (not uploaded yet). */
  photo: {file: File; url: string} | null;
  /** The existing photo should be removed on save. */
  removePhoto: boolean;
};

const FIRSTS: [string, string][] = [
  ['第一次洗澡', 'First bath'],
  ['第一次出门', 'First outing'],
  ['第一次睡整觉', 'First full night’s sleep'],
  ['第一颗牙', 'First tooth'],
  ['第一口辅食', 'First solid food'],
  ['第一次剪头发', 'First haircut'],
  ['第一次坐飞机', 'First flight'],
];

export default function MomentSheet({
  draft,
  setDraft,
  existingPhotoUrl,
  today,
  busy,
  error,
  onSave,
  onDelete,
  onClose,
}: {
  draft: MomentDraft;
  setDraft: (d: MomentDraft) => void;
  existingPhotoUrl?: string;
  today: string;
  busy: boolean;
  error: string;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const {baby, form, editing, photo} = draft;
  const item = guideItem(form.guide_key);
  const set = (patch: Partial<MomentForm>) => setDraft({...draft, form: {...form, ...patch}});
  const preview = photo?.url ?? (draft.removePhoto ? undefined : existingPhotoUrl);
  const notePlaceholder: Record<MomentKind, string> = {
    milestone: tr('当时的情形、谁在身边……', 'What happened, who was there…'),
    first: tr('当时的情形、谁在身边……', 'What happened, who was there…'),
    vaccine: tr('接种点、疫苗品牌、接种后的反应……', 'Clinic, vaccine brand, any reaction…'),
    checkup: tr('身高体重、医生的建议……', 'Measurements, what the doctor said…'),
  };
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[#10231b]/40"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={editing ? tr('编辑成长时刻', 'Edit moment') : tr('记录成长时刻', 'New moment')}
        className="ui-sheet safe-bottom max-h-[94dvh] w-full max-w-lg overflow-y-auto p-5"
        onSubmit={e => {
          e.preventDefault();
          onSave();
        }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-(--line)" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {editing ? tr('编辑时刻', 'Edit moment') : tr('记录时刻', 'New moment')}
            </h2>
            <p className="text-sm text-(--muted)">{babyName(baby)}</p>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-(--chip)"
            aria-label={tr('关闭', 'Close')}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {item ? (
          <div className="mt-5 flex items-start gap-3 rounded-[20px] bg-(--surface-2) p-3.5">
            <KindBadge kind={form.kind} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{say(item.title)}</p>
              <p className="mt-0.5 text-xs text-(--muted)">
                {item.kind === 'milestone'
                  ? tr(`多数宝宝 ${ageWindowLabel(item)}前做到`, `Most babies by ${ageWindowLabel(item)}`)
                  : ageWindowLabel(item)}
              </p>
              <div className="mt-1">
                <SourceLink source={item.source} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-4 gap-2" role="radiogroup" aria-label={tr('类型', 'Type')}>
              {(['first', 'milestone', 'vaccine', 'checkup'] as MomentKind[]).map(kind => {
                const k = KIND[kind];
                const Icon = k.icon;
                const on = form.kind === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-semibold transition ${on ? `border-transparent ${k.pale} ${k.ink} ring-2 ring-current` : 'border-(--line) bg-(--surface) text-(--muted)'}`}
                    onClick={() => set({kind})}
                  >
                    <Icon size={19} />
                    {k.label()}
                  </button>
                );
              })}
            </div>
            {form.kind === 'first' && (
              <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
                {FIRSTS.map(([zh, en]) => {
                  const label = tr(zh, en);
                  return (
                    <button
                      key={en}
                      type="button"
                      className={`min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium ${form.title === label ? 'border-(--warm) bg-(--warm-pale) text-(--warm-ink)' : 'border-(--line) bg-(--surface) text-(--ink-2)'}`}
                      onClick={() => set({title: label})}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-semibold text-(--muted)">{tr('标题', 'Title')}</span>
              <input
                className="ui-input"
                value={form.title}
                maxLength={80}
                placeholder={
                  form.kind === 'vaccine'
                    ? tr('例如：Hib 疫苗第 1 剂', 'e.g. Hib dose 1')
                    : form.kind === 'checkup'
                      ? tr('例如：6 月龄体检', 'e.g. 6-month checkup')
                      : tr('例如：第一次自己翻身', 'e.g. Rolled over by herself')
                }
                onChange={e => set({title: e.target.value})}
              />
            </label>
          </>
        )}

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-(--muted)">{tr('日期', 'Date')}</span>
          <input
            type="date"
            className="ui-input"
            value={form.occurred_on}
            min={baby.birthday}
            max={today}
            onChange={e => set({occurred_on: e.target.value})}
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-(--muted)">
            {tr('备注（选填）', 'Note (optional)')}
          </span>
          <textarea
            className="ui-input min-h-24 resize-none"
            value={form.note}
            maxLength={500}
            placeholder={notePlaceholder[form.kind]}
            onChange={e => set({note: e.target.value})}
          />
        </label>

        <div className="mt-4">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              if (photo) URL.revokeObjectURL(photo.url);
              setDraft({...draft, photo: {file, url: URL.createObjectURL(file)}, removePhoto: false});
            }}
          />
          {preview ? (
            <div className="relative overflow-hidden rounded-[20px]">
              <img src={preview} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  type="button"
                  className="rounded-full bg-black/55 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur"
                  onClick={() => fileInput.current?.click()}
                >
                  {tr('更换', 'Change')}
                </button>
                <button
                  type="button"
                  aria-label={tr('移除照片', 'Remove photo')}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
                  onClick={() => {
                    if (photo) URL.revokeObjectURL(photo.url);
                    setDraft({...draft, photo: null, removePhoto: !!editing?.photo_path});
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="flex min-h-20 w-full items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-(--line-strong) text-sm font-semibold text-(--muted) transition active:bg-(--surface-2)"
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus size={20} />
              {tr('添加照片（选填）', 'Add a photo (optional)')}
            </button>
          )}
        </div>

        {error && <Alert text={error} />}
        <button type="submit" className="ui-primary mt-5" disabled={busy}>
          {busy ? tr('保存中…', 'Saving…') : tr('保存', 'Save')}
        </button>
        {editing && (
          <button
            type="button"
            disabled={busy}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-(--danger)"
            onClick={onDelete}
          >
            <Trash2 size={17} />
            {tr('删除这条记录', 'Delete this entry')}
          </button>
        )}
      </form>
    </div>
  );
}
