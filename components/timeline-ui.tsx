'use client';
import {BookOpen, ExternalLink, Sparkles, Star, Stethoscope, Syringe, type LucideIcon} from 'lucide-react';
import {say, type GuideItem, type Source} from '@/lib/guide';
import {tr} from '@/lib/i18n';
import type {MomentKind} from '@/lib/types';

/** Look of each kind of timeline entry: icon, accent colour and label. */
export const KIND: Record<
  MomentKind,
  {icon: LucideIcon; ink: string; pale: string; dot: string; label: () => string}
> = {
  milestone: {
    icon: Sparkles,
    ink: 'text-(--brand)',
    pale: 'bg-(--brand-pale)',
    dot: 'bg-(--brand-solid)',
    label: () => tr('里程碑', 'Milestone'),
  },
  first: {
    icon: Star,
    ink: 'text-(--warm-ink)',
    pale: 'bg-(--warm-pale)',
    dot: 'bg-(--warm)',
    label: () => tr('第一次', 'First'),
  },
  vaccine: {
    icon: Syringe,
    ink: 'text-(--sky)',
    pale: 'bg-(--sky-pale)',
    dot: 'bg-(--sky)',
    label: () => tr('疫苗', 'Vaccine'),
  },
  checkup: {
    icon: Stethoscope,
    ink: 'text-(--plum)',
    pale: 'bg-(--plum-pale)',
    dot: 'bg-(--plum)',
    label: () => tr('体检', 'Checkup'),
  },
};
export const itemKind = (item: GuideItem): MomentKind =>
  item.kind === 'vaccine' || item.kind === 'checkup' ? item.kind : 'milestone';

export function KindBadge({kind, size = 'md'}: {kind: MomentKind; size?: 'sm' | 'md'}) {
  const k = KIND[kind];
  const Icon = k.icon;
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${k.pale} ${k.ink} ${size === 'sm' ? 'h-9 w-9 rounded-xl' : 'h-11 w-11 rounded-2xl'}`}
      aria-hidden="true"
    >
      <Icon size={size === 'sm' ? 17 : 20} />
    </span>
  );
}

export function SourceLink({source}: {source: Source}) {
  const name = say(source.name);
  return source.url ? (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-(--soft) underline decoration-(--line-strong) underline-offset-2"
    >
      {name}
      <ExternalLink size={11} />
    </a>
  ) : (
    <span className="text-xs text-(--soft)">{name}</span>
  );
}

export function Disclaimer() {
  return (
    <p className="px-2 text-center text-xs leading-relaxed text-(--soft)">
      {tr(
        '指南内容整理自 CDC、美国儿科学会（AAP）和中国国家疾控局等公开资料，仅供参考，不能替代医生建议。每个宝宝的节奏都不一样，有担心请咨询儿科医生。',
        'Guide content is based on public material from the CDC, the American Academy of Pediatrics and China’s National Disease Control and Prevention Administration. It is for reference only and is not medical advice. Every baby develops at their own pace; ask your pediatrician if you’re concerned.',
      )}
    </p>
  );
}

/** A "read more" row that opens the article behind a guide item. */
export function ReadLink({source, label}: {source: Source; label?: string}) {
  if (!source.url) return <SourceLink source={source} />;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="flex min-h-11 items-center gap-2.5 rounded-xl bg-(--sky-pale) px-3 text-sm font-semibold text-(--sky) transition active:scale-[.99]"
    >
      <BookOpen size={16} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label ?? say(source.name)}</span>
      <ExternalLink size={14} className="shrink-0 opacity-70" />
    </a>
  );
}
