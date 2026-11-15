'use client';
import {Check, Languages, Milk, Stethoscope, X} from 'lucide-react';
import {languages, setLang, tr, useLang} from '@/lib/i18n';
import {setUnit, useUnit, volumeUnits} from '@/lib/units';
import {regions, setRegion, useRegion} from '@/lib/region';

/** Per-device preferences: language, volume unit and health-guide region. */
export default function SettingsSheet({onClose}: {onClose: () => void}) {
  const lang = useLang();
  const unit = useUnit();
  const region = useRegion();
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
        <fieldset className="mt-6">
          <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-(--muted)">
            <Languages size={16} />
            {tr('语言', 'Language')}
          </legend>
          <div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface)">
            {languages.map(option => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={lang === option.value}
                className="flex min-h-14 w-full items-center justify-between border-b border-(--line) px-4 text-left font-medium last:border-0"
                onClick={() => setLang(option.value)}
              >
                <span>{option.label}</span>
                {lang === option.value && <Check size={20} className="text-(--brand)" />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-(--soft)">
            {tr(
              '只对这台设备生效，家人可以各自选择语言。',
              'Applies to this device only. Each family member can choose their own.',
            )}
          </p>
        </fieldset>
        <fieldset className="mt-6">
          <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-(--muted)">
            <Milk size={16} />
            {tr('奶量单位', 'Volume unit')}
          </legend>
          <div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface)">
            {volumeUnits.map(option => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={unit === option.value}
                className="flex min-h-14 w-full items-center justify-between border-b border-(--line) px-4 text-left font-medium last:border-0"
                onClick={() => setUnit(option.value)}
              >
                <span>
                  {option.value === 'ml'
                    ? tr('毫升 (ml)', 'Millilitres (ml)')
                    : tr('盎司 (oz)', 'Ounces (oz)')}
                </span>
                {unit === option.value && <Check size={20} className="text-(--brand)" />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-(--soft)">
            {tr(
              '只影响这台设备的显示和输入，记录统一按 ml 保存，1 oz ≈ 29.6 ml。',
              'Changes display and input on this device only. Records are stored in ml; 1 oz ≈ 29.6 ml.',
            )}
          </p>
        </fieldset>
        <fieldset className="mt-6">
          <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-(--muted)">
            <Stethoscope size={16} />
            {tr('健康指南地区', 'Health guide region')}
          </legend>
          <div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface)">
            {regions.map(option => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={region === option.value}
                className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-(--line) px-4 py-2 text-left last:border-0"
                onClick={() => setRegion(option.value)}
              >
                <span>
                  <span className="block font-medium">{option.label()}</span>
                  <span className="block text-xs text-(--muted)">{option.detail()}</span>
                </span>
                {region === option.value && <Check size={20} className="shrink-0 text-(--brand)" />}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-(--soft)">
            {tr(
              '决定成长时间线上显示哪个国家的疫苗和体检时间表。只对这台设备生效。',
              'Sets which country’s vaccine and checkup schedule the growth timeline shows. Applies to this device only.',
            )}
          </p>
        </fieldset>
      </div>
    </div>
  );
}
