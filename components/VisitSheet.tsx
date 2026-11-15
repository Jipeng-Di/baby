'use client';
import {useState} from 'react';
import {Check, X} from 'lucide-react';
import {Alert} from './ui';
import {KindBadge, itemKind} from './timeline-ui';
import {say, type GuideItem} from '@/lib/guide';
import {tr} from '@/lib/i18n';
import {babyName, type Baby} from '@/lib/types';

/** Logs a checkup and the vaccines given at it in one go, all on the same date. */
export default function VisitSheet({
  baby,
  items,
  today,
  busy,
  error,
  onSave,
  onClose,
}: {
  baby: Baby;
  items: GuideItem[];
  today: string;
  busy: boolean;
  error: string;
  onSave: (date: string, items: GuideItem[]) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(today);
  const [picked, setPicked] = useState(() => new Set(items.map(i => i.key)));
  const chosen = items.filter(i => picked.has(i.key));
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
        aria-label={tr('记下这次就诊', 'Log this visit')}
        className="ui-sheet safe-bottom max-h-[94dvh] w-full max-w-lg overflow-y-auto p-5"
        onSubmit={e => {
          e.preventDefault();
          onSave(date, chosen);
        }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-(--line)" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{tr('记下这次就诊', 'Log this visit')}</h2>
            <p className="text-sm text-(--muted)">
              {babyName(baby)} · {tr('勾选这次做了的项目', 'Tick what was done')}
            </p>
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
        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-semibold text-(--muted)">
            {tr('就诊日期', 'Visit date')}
          </span>
          <input
            type="date"
            className="ui-input"
            value={date}
            min={baby.birthday}
            max={today}
            onChange={e => setDate(e.target.value)}
          />
        </label>
        <ul className="mt-4 divide-y divide-(--line) rounded-[22px] border border-(--line) bg-(--surface)/70 px-3">
          {items.map(item => {
            const on = picked.has(item.key);
            return (
              <li key={item.key}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
                  onClick={() => {
                    const next = new Set(picked);
                    if (on) next.delete(item.key);
                    else next.add(item.key);
                    setPicked(next);
                  }}
                >
                  <KindBadge kind={itemKind(item)} size="sm" />
                  <span className="flex-1 text-[15px] font-medium leading-snug">{say(item.title)}</span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${on ? 'border-transparent bg-(--brand-solid) text-white' : 'border-(--line-strong)'}`}
                  >
                    {on && <Check size={17} strokeWidth={3} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 px-1 text-xs leading-relaxed text-(--soft)">
          {tr(
            '想写接种点、疫苗品牌或接种反应，可以保存后在时间线上点开那一条补充。',
            'To add the clinic, vaccine brand or any reaction, open the entry on the timeline after saving.',
          )}
        </p>
        {error && <Alert text={error} />}
        <button type="submit" className="ui-primary mt-5" disabled={busy || !chosen.length}>
          {busy
            ? tr('保存中…', 'Saving…')
            : tr(`保存 ${chosen.length} 项`, `Save ${chosen.length} item${chosen.length === 1 ? '' : 's'}`)}
        </button>
      </form>
    </div>
  );
}
