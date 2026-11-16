'use client';
import {useRouter} from 'next/navigation';
import {CalendarDays, House, LayoutDashboard, Sprout, type LucideIcon} from 'lucide-react';
import {tr} from '@/lib/i18n';
import {readLocal, writeLocal} from '@/lib/storage';
import type {Page} from './App';

/** The Records and Growth tabs each hold two views; the tab reopens whichever was used last. */
const GROUPS = {
  history: {key: 'records-tab', views: ['history', 'trends']},
  timeline: {key: 'growth-tab', views: ['timeline', 'growth']},
} as const satisfies Record<string, {key: string; views: readonly Page[]}>;
type Tab = 'today' | keyof typeof GROUPS | 'family';

function tabOf(page: Page): Tab {
  for (const [tab, group] of Object.entries(GROUPS))
    if ((group.views as readonly Page[]).includes(page)) return tab as Tab;
  return page === 'family' ? 'family' : 'today';
}
function lastView(tab: Tab): Page {
  if (!(tab in GROUPS)) return tab;
  const {key, views} = GROUPS[tab as keyof typeof GROUPS];
  const stored = readLocal(key);
  return (views as readonly string[]).includes(stored ?? '') ? (stored as Page) : views[0];
}
/** Remember which view of a two-view tab is open, so the tab returns to it next time. */
export function rememberView(page: Page) {
  for (const {key, views} of Object.values(GROUPS))
    if ((views as readonly Page[]).includes(page)) writeLocal(key, page);
}

export default function BottomNav({page}: {page: Page}) {
  const router = useRouter();
  const current = tabOf(page);
  const tabs: [Tab, string, LucideIcon][] = [
    ['today', tr('今天', 'Today'), LayoutDashboard],
    ['history', tr('记录', 'Records'), CalendarDays],
    ['timeline', tr('成长', 'Growth'), Sprout],
    ['family', tr('家庭', 'Family'), House],
  ];
  return (
    // A tab bar flush with the bottom edge; the safe-area padding keeps the buttons above the home indicator.
    <nav
      data-tab-bar
      className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-(--rim)/90 bg-(--paper)/94 shadow-[0_-8px_30px_rgba(19,50,39,.08)] backdrop-blur-2xl"
      aria-label={tr('主导航', 'Main navigation')}
    >
      <div className="flex gap-1 px-2 py-1.5">
        {tabs.map(([tab, label, Icon]) => {
          const on = tab === current;
          return (
            <button
              key={tab}
              aria-current={on ? 'page' : undefined}
              className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] text-[11px] transition ${on ? 'bg-(--brand-pale) font-bold text-(--brand)' : 'text-(--soft) active:bg-(--surface-2)'}`}
              onClick={() => router.push(`/${lastView(tab)}`)}
            >
              <Icon size={21} strokeWidth={on ? 2.5 : 1.8} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
