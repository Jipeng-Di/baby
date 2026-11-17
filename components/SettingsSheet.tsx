'use client';
import {useState} from 'react';
import ConfirmDialog from './ConfirmDialog';
import {
  Check,
  ChevronDown,
  Download,
  Languages,
  LogOut,
  Milk,
  Ruler,
  Stethoscope,
  UserRound,
  X,
} from 'lucide-react';
import {languages, setLang, tr, useLang} from '@/lib/i18n';
import {setUnit, useUnit, volumeUnits} from '@/lib/units';
import {regions, setRegion, useRegion} from '@/lib/region';
import {growthUnits, setGrowthUnit, useGrowthUnit} from '@/lib/growth-units';

const SITE = 'https://baby-feeding-three.vercel.app';

type Option<T extends string> = {value: T; label: string; detail?: string};

/** A row that shows a label and a summary; tapping it unfolds its content. */
function Fold({
  icon: Icon,
  label,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: typeof Languages;
  label: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
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
        {summary && <span className="text-sm text-(--muted)">{summary}</span>}
        <ChevronDown
          size={18}
          className={`shrink-0 text-(--soft) transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/** One preference: the folded row shows the current choice; unfolding lists the options. */
function Preference<T extends string>({
  icon,
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
  return (
    <Fold
      icon={icon}
      label={label}
      summary={options.find(o => o.value === value)?.label}
      open={open}
      onToggle={onToggle}
    >
      <div role="radiogroup" aria-label={label} className="overflow-hidden rounded-xl bg-(--surface-2)">
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
    </Fold>
  );
}

/** Settings sheet: per-device preferences, CSV export and sign-out. */
export default function SettingsSheet({
  email,
  busy,
  onExportFeedings,
  onExportGrowth,
  onExportMoments,
  onExportEvents,
  onSignOut,
  onDeleteAccount,
  onClose,
}: {
  /** The signed-in account, shown next to the sign-out button. */
  email: string | null;
  busy: boolean;
  onExportFeedings: () => Promise<void>;
  onExportGrowth: () => Promise<void>;
  onExportMoments: () => Promise<void>;
  /** Missing until the care-log table exists. */
  onExportEvents?: () => Promise<void>;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<void>;
  onClose: () => void;
}) {
  const lang = useLang();
  const unit = useUnit();
  const region = useRegion();
  const growthUnit = useGrowthUnit();
  type Section = 'lang' | 'unit' | 'growth' | 'region' | 'export';
  const [open, setOpen] = useState<Section | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toggle = (key: Section) => () => setOpen(current => (current === key ? null : key));
  const exports: [string, () => Promise<void>][] = [
    [tr('喝奶记录', 'Feedings'), onExportFeedings],
    [tr('生长记录', 'Growth records'), onExportGrowth],
    [tr('成长时刻（里程碑、疫苗、体检）', 'Moments (milestones, vaccines, checkups)'), onExportMoments],
    ...(onExportEvents
      ? [[tr('日常记录（睡眠、尿布等）', 'Care log (sleep, diapers and more)'), onExportEvents] as [string, () => Promise<void>]]
      : []),
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
            icon={Ruler}
            label={tr('测量单位', 'Measurements')}
            note={tr(
              '体重、身长、头围和体温的显示与输入单位。只对这台设备生效，记录统一按公制保存。',
              'For weight, length, head size and temperature on this device only. Records are stored in metric.',
            )}
            value={growthUnit}
            options={growthUnits.map(o => ({value: o.value, label: o.label()}))}
            open={open === 'growth'}
            onToggle={toggle('growth')}
            onChange={setGrowthUnit}
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

        <h3 className="mt-6 mb-2 text-sm font-semibold text-(--muted)">{tr('数据', 'Data')}</h3>
        <div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface)">
          <Fold
            icon={Download}
            label={tr('数据导出', 'Export data')}
            summary="CSV"
            open={open === 'export'}
            onToggle={toggle('export')}
          >
            <div className="overflow-hidden rounded-xl bg-(--surface-2)">
              {exports.map(([label, run]) => (
                <button
                  key={label}
                  type="button"
                  className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-(--line)/60 px-3 text-left text-sm font-medium text-(--brand) last:border-0 disabled:opacity-60"
                  disabled={busy}
                  onClick={async () => {
                    await run();
                    onClose();
                  }}
                >
                  <span>{label}</span>
                  <Download size={16} className="shrink-0" />
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-(--soft)">
              {tr(
                '导出为 CSV，可用 Excel 或 Numbers 打开。换手机前建议备份一次。',
                'Export as CSV to open in Excel or Numbers. A good backup before switching phones.',
              )}
            </p>
          </Fold>
        </div>

        <h3 className="mt-6 mb-2 text-sm font-semibold text-(--muted)">{tr('账户', 'Account')}</h3>
        <div className="flex items-center gap-3 rounded-2xl border border-(--line) bg-(--surface) px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--brand-pale) text-(--brand)">
            <UserRound size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-(--soft)">{tr('当前登录', 'Signed in as')}</span>
            <span className="block truncate text-sm font-medium">
              {email || tr('未知账号', 'Unknown account')}
            </span>
          </span>
          <button
            type="button"
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-(--danger)/40 px-3.5 text-sm font-semibold text-(--danger) active:bg-(--danger-pale)"
            onClick={onSignOut}
          >
            <LogOut size={16} />
            {tr('退出登录', 'Sign out')}
          </button>
        </div>
        <button
          type="button"
          className="mt-3 min-h-11 w-full text-center text-xs text-(--soft) underline-offset-2 hover:underline"
          onClick={() => setConfirmDelete(true)}
        >
          {tr('删除账号', 'Delete account')}
        </button>
        {/* Absolute links: inside the iOS app they open in Safari instead of replacing the app's page. */}
        <p className="mt-4 flex justify-center gap-4 text-center text-[11px] text-(--soft)">
          <a
            href={`${SITE}/support`}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            {tr('帮助与支持', 'Help & support')}
          </a>
          <a
            href={`${SITE}/privacy`}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:underline"
          >
            {tr('隐私政策', 'Privacy policy')}
          </a>
        </p>
      </div>
      {confirmDelete && (
        <ConfirmDialog
          title={tr('删除账号？', 'Delete your account?')}
          text={tr(
            '你的账号会被永久删除。如果你是家庭里唯一的成员，这个家庭的全部记录和照片也会一起删除，无法恢复。',
            'Your account will be permanently deleted. If you are the only member of your family, all of its records and photos are deleted too. This can’t be undone.',
          )}
          confirmLabel={tr('永久删除', 'Delete permanently')}
          busyLabel={tr('删除中…', 'Deleting…')}
          busy={busy}
          onConfirm={async () => {
            await onDeleteAccount();
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
