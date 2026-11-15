'use client';
import {useRef, useState} from 'react';
import {ArrowDown, LoaderCircle} from 'lucide-react';
import {tr} from '@/lib/i18n';

const TRIGGER = 56;
const MAX = 88;

/** Lets the page be dragged down from the top to run `onRefresh`, with the usual arrow/spinner hint. */
export default function PullToRefresh({
  disabled,
  onRefresh,
  children,
}: {
  /** True while a sheet or dialog is open, so a drag inside it never refreshes the page. */
  disabled: boolean;
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [distance, setDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<{x: number; y: number} | null>(null);
  const pulled = useRef(0);

  function reset() {
    start.current = null;
    pulled.current = 0;
    setDragging(false);
    setDistance(0);
  }
  function onTouchStart(event: React.TouchEvent) {
    if (refreshing || disabled || window.scrollY > 0) return;
    const touch = event.touches[0];
    start.current = {x: touch.clientX, y: touch.clientY};
    pulled.current = 0;
    setDragging(true);
  }
  function onTouchMove(event: React.TouchEvent) {
    if (!start.current || refreshing) return;
    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - start.current.x);
    const dy = touch.clientY - start.current.y;
    if (dy <= 0 || dx > dy) {
      reset();
      return;
    }
    pulled.current = Math.min(MAX, dy * 0.45);
    setDistance(pulled.current);
    event.preventDefault();
  }
  async function onTouchEnd() {
    const go = pulled.current >= TRIGGER && !refreshing;
    start.current = null;
    pulled.current = 0;
    setDragging(false);
    if (!go) {
      setDistance(0);
      return;
    }
    setRefreshing(true);
    setDistance(52);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setDistance(0);
    }
  }
  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="fixed left-1/2 top-[max(12px,env(safe-area-inset-top))] z-0 flex -translate-x-1/2 items-center gap-2 text-sm font-semibold text-(--brand)"
      >
        {refreshing ? (
          <>
            <LoaderCircle className="animate-spin" size={18} />
            {tr('正在刷新', 'Refreshing')}
          </>
        ) : distance > 0 ? (
          <>
            <ArrowDown
              className={`transition-transform ${distance >= TRIGGER ? 'rotate-180' : ''}`}
              size={18}
            />
            {distance >= TRIGGER ? tr('松开刷新', 'Release to refresh') : tr('下拉刷新', 'Pull to refresh')}
          </>
        ) : null}
      </div>
      <div
        className="min-h-screen pb-32"
        style={{
          transform: `translateY(${distance}px)`,
          transition: dragging ? 'none' : 'transform 180ms ease',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={reset}
      >
        {children}
      </div>
    </>
  );
}
