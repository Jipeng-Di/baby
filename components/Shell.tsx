'use client';
import {usePathname} from 'next/navigation';
import App, {PAGES, type Page} from './App';

/**
 * Keeps one App mounted across route changes. Each route's page renders nothing; the pathname decides
 * which view App shows, so switching tabs no longer re-loads auth, family and feeding data.
 */
export default function Shell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const [first, second] = pathname.split('/').filter(Boolean);
  if (first === 'join' && second) return <App page="join" inviteCode={decodeURIComponent(second)} />;
  if (first && !second && (PAGES as readonly string[]).includes(first)) return <App page={first as Page} />;
  // The root URL is the Today tab, so the native app (which opens index.html) lands on it without a redirect.
  if (!first) return <App page="today" />;
  return <>{children}</>;
}
