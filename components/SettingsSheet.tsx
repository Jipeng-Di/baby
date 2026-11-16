'use client';
import {useState} from 'react';
import {Check, ChevronDown, Download, Languages, LogOut, Milk, Stethoscope, X} from 'lucide-react';
import {languages, setLang, tr, useLang} from '@/lib/i18n';
import {setUnit, useUnit, volumeUnits} from '@/lib/units';
import {regions, setRegion, useRegion} from '@/lib/region';

type Option<T extends string> = {value: T; label: string; detail?: string};

/** One preference: a closed row shows the current choice; tapping it unfolds the options. */
function Preference<T extends string>({
  icon: Icon,
  label,
  note,
  value,
  options,
  open,
  onToggle,
  onChange,
}: {
  icon: typeof Languages;
  label: string;
  note: string;
  value: T;
  options: Option<T>[];
  open: boolean;
  onToggle: () => void;
  onChange: (value: T) => void;
}) {
  const current = options.find(o => o.value === value);
  return (
    <div className="border-b border-(--line) last:border-0">
      <button
        type="button"
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <Icon size={18} className="shrink-0 text-(--brand)" />
        <span className="flex-1 font-medium">{label}</span>
        <span className="text-sm text-(--muted)">{current?.label}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-(--soft) transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4" role="radiogroup" aria-label={label}>
          <div className="overflow-hidden rounded-xl bg-(--surface-2)">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={value === option.value}
                className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-(--line)/60 px-3 text-left last:border-0"
                onClick={() => onChange(option.value)}
              >
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  {option.detail && <span className="block text-xs text-(--muted)">{option.detail}</span>}
                </span>
                {value === option.value && <Check size={18} className="shrink-0 text-(--brand)" />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-(--soft)">{note}</p>
        </div>
      )}
    </div>
  );
}

/** Settings sheet: per-device preferences, CSV export and sign-out. */
export default function SettingsSheet({
  busy,
  onExportFeedings,
  onExportGrowth,
  onExportMoments,
  onSignOut,
  onClose,
}: {
  busy: boolean;
  onExportFeedings: () => Promise<void>;
  onExportGrowth: () => Promise<void>;
  onExportMoments: () => Promise<void>;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const lang = useLang();
  const unit = useUnit();
  const region = useRegion();
  const [open, setOpen] = useState<'lang' | 'unit' | 'region' | null>(null);
  const toggle = (key: 'lang' | 'unit' | 'region') => () =>
    setOpen(current => (current === key ? null : key));
  const exports: [string, () => Promise<void>][] = [
    [tr('喝奶记录', 'Feedings'), onExportFeedings],
    [tr('生长记录', 'Growth records'), onExportGrowth],
    [tr('成长时刻（里程碑、疫苗、体检）', 'Moments (milestones, vaccines, checkups)'), onExportMoments],
  ];
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-[#10231b]/40"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr('设置', 'Settings')}
        className="ui-sheet safe-bottom max-h-[94dvh] w-full max-w-lg overflow-y-auto p-5"
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-(--line)" />
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{tr('设置', 'Settings')}</h2>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-(--chip)"
            aria-label={tr('关闭', 'Close')}
            onClick={() => onClose()}
          >
            <X size={20} />
          </button>
        </div>

        <h3 className="mt-6 mb-2 text-sm font-semibold text-(--muted)">{tr('偏好', 'Preferences')}</h3>
        <div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface)">
          <Preference
            icon={Languages}
            label={tr('语言', 'Language')}
            note={tr(
              '只对这台设备生效，家人可以各自选择语言。',
              'Applies to this device only. Each family member can choose their own.',
            )}
            value={lang}
            options={languages}
            open={open === 'lang'}
            onToggle={toggle('lang')}
            onChange={setLang}
          />
          <Preference
            icon={Milk}
            label={tr('奶量单位', 'Volume unit')}
            note={tr(
              '只影响这台设备的显示和输入，记录统一按 ml 保存，1 oz ≈ 29.6 ml。',
              'Changes display and input on this device only. Records are stored in ml; 1 oz ≈ 29.6 ml.',
            )}
            value={unit}
            options={volumeUnits.map(o => ({
              value: o.value,
              label: o.value === 'ml' ? tr('毫升 (ml)', 'Millilitres (ml)') : tr('盎司 (oz)', 'Ounces (oz)'),
            }))}
            open={open === 'unit'}
            onToggle={toggle('unit')}
            onChange={setUnit}
          />
          <Preference
            icon={Stethoscope}
            label={tr('健康指南地区', 'Health guide region')}
            note={tr(
              '决定成长时间线上显示哪个国家的疫苗和体检时间表。只对这台设备生效。',
              'Sets which country’s vaccine and checkup schedule the growth timeline shows. Applies to this device only.',
            )}
            value={region}
            options={regions.map(o => ({value: o.value, label: o.label(), detail: o.detail()}))}
            open={open === 'region'}
            onToggle={toggle('region')}
            onChange={setRegion}
          />
        </div>

        <h3 className="mt-6 mb-2 text-sm font-semibold text-(--muted)">{tr('数据导出', 'Export data')}</h3>
        <div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface)">
          {exports.map(([label, run]) => (
            <button
              key={label}
              type="button"
              className="flex min-h-14 w-full items-center gap-3 border-b border-(--line) px-4 text-left font-medium text-(--brand) last:border-0 disabled:opacity-60"
              disabled={busy}
              onClick={async () => {
                await run();
                onClose();
              }}
            >
              <Download size={18} className="shrink-0" />
              <span className="flex-1">{label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-(--soft)">
          {tr(
            '导出为 CSV，可用 Excel 或 Numbers 打开。换手机前建议备份一次。',
            'Export as CSV to open in Excel or Numbers. A good backup before switching phones.',
          )}
        </p>

        <h3 className="mt-6 mb-2 text-sm font-semibold text-(--muted)">{tr('账户', 'Account')}</h3>
        <div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface)">
          <button
            type="button"
            className="flex min-h-14 w-full items-center gap-3 px-4 text-left font-medium text-(--danger)"
            onClick={onSignOut}
          >
            <LogOut size={18} className="shrink-0" />
            {tr('退出登录', 'Sign out')}
          </button>
        </div>
      </div>
    </div>
  );
}
