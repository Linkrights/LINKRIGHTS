'use client';

// 화면 구석에 떠 있는 빠른 이동 메뉴입니다. (PC) 휴대폰에서는 아래쪽 띠로 바뀝니다.
//
// 왜 두나요?
//   어느 화면을 보고 있든 "도움받을 곳 · 프로그램 · AI 질문 · 커뮤니티" 네 가지로 바로 갈 수 있게 하기 위해서입니다.
//   네 가지는 LINKRIGHTS에서 실제로 "행동"이 일어나는 곳이고, 나머지는 읽는 화면입니다.
//
// 지키는 것
//  - 처음에는 오른쪽 아래 구석에 있고, 손잡이를 끌어 원하는 자리로 옮길 수 있습니다. (가리는 글이 있으면 치우라고)
//  - 옮긴 자리와 접은 상태는 이 브라우저에만 기억합니다. (서버로 보내지 않습니다)
//  - 첫 화면(welcome)과 관리자 화면에는 보이지 않습니다.
//  - 키보드로도 쓸 수 있고, 화면낭독기에는 "빠른 이동" 메뉴로 읽힙니다.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { getMessages, type Locale } from '@/lib/i18n';

const OPEN_KEY = 'linkrights:quick-menu';
const SPOT_KEY = 'linkrights:quick-menu-spot';
/** 화면 가장자리에서 띄울 거리 */
const EDGE = 20;

interface Spot {
  x: number;
  y: number;
}

export function QuickMenu({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const q = t.quickMenu;
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(true);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [dragging, setDragging] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(OPEN_KEY) !== 'closed');
      const saved = window.localStorage.getItem(SPOT_KEY);
      if (saved) {
        const value = JSON.parse(saved) as Spot;
        if (typeof value?.x === 'number' && typeof value?.y === 'number') setSpot(value);
      }
    } catch {
      /* 저장소를 쓸 수 없으면 기본 자리에 둡니다 */
    }
  }, []);

  const remember = useCallback((key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* 기억하지 못해도 이번 화면에서는 동작합니다 */
    }
  }, []);

  // 창 크기가 바뀌어 메뉴가 화면 밖으로 나가면 안으로 들여놓습니다.
  useEffect(() => {
    if (!spot) return;
    function keepInside() {
      const box = railRef.current?.getBoundingClientRect();
      if (!box) return;
      setSpot((current) => {
        if (!current) return current;
        const x = Math.min(Math.max(current.x, EDGE), Math.max(EDGE, window.innerWidth - box.width - EDGE));
        const y = Math.min(Math.max(current.y, EDGE), Math.max(EDGE, window.innerHeight - box.height - EDGE));
        return x === current.x && y === current.y ? current : { x, y };
      });
    }
    window.addEventListener('resize', keepInside);
    return () => window.removeEventListener('resize', keepInside);
  }, [spot]);

  function startDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const box = railRef.current?.getBoundingClientRect();
    if (!box) return;
    grab.current = { dx: event.clientX - box.left, dy: event.clientY - box.top };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging || !grab.current) return;
    const box = railRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.min(Math.max(event.clientX - grab.current.dx, EDGE), Math.max(EDGE, window.innerWidth - box.width - EDGE));
    const y = Math.min(Math.max(event.clientY - grab.current.dy, EDGE), Math.max(EDGE, window.innerHeight - box.height - EDGE));
    setSpot({ x, y });
  }

  function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    setDragging(false);
    grab.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (spot) remember(SPOT_KEY, JSON.stringify(spot));
  }

  // 첫 안내 화면에서는 보여주지 않습니다. (선택에 집중할 수 있도록)
  if (pathname.includes('/welcome')) return null;

  const items: { key: string; href: string; icon: IconName; label: string }[] = [
    { key: 'organizations', href: `/${locale}/organizations`, icon: 'map-pin', label: q.organizations },
    { key: 'programs', href: `/${locale}/programs`, icon: 'briefcase', label: q.programs },
    { key: 'ask', href: `/${locale}/ask`, icon: 'sparkles', label: q.ask },
    { key: 'community', href: `/${locale}/community`, icon: 'message', label: q.community },
  ];

  return (
    <nav aria-label={q.title} className="lr-quick">
      {/* 휴대폰: 아래쪽 띠 — 네 칸을 똑같이 나눠 글자와 함께 보여줍니다. (옮기거나 접지 않습니다) */}
      <ul className="lr-quick-bar lg:hidden">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.key}>
              <Link href={item.href} aria-current={active ? 'page' : undefined} className="lr-quick-bar-item">
                <Icon name={item.icon} size={22} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* PC: 오른쪽 아래 구석. 손잡이를 끌어 옮길 수 있습니다. */}
      <div
        ref={railRef}
        className={`lr-quick-rail hidden lg:flex ${dragging ? 'is-dragging' : ''}`}
        style={spot ? { left: spot.x, top: spot.y, right: 'auto', bottom: 'auto' } : undefined}
      >
        {open && (
          <ul className="flex flex-col gap-2.5">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`lr-quick-dot group ${active ? 'is-active' : ''}`}
                  >
                    <Icon name={item.icon} size={24} />
                    <span className="lr-quick-tip">{item.label}</span>
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center gap-1.5">
          {/* 손잡이: 끌어서 옮깁니다. (누르기만 하면 아무 일도 일어나지 않습니다) */}
          <button
            type="button"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-label={q.move}
            className="lr-quick-grip group"
          >
            <span aria-hidden="true">⠿</span>
            <span className="lr-quick-tip">{q.move}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !open;
              setOpen(next);
              remember(OPEN_KEY, next ? 'open' : 'closed');
            }}
            aria-expanded={open}
            className="lr-quick-toggle group"
          >
            <Icon name={open ? 'close' : 'menu'} size={open ? 18 : 22} />
            <span className="lr-quick-tip">{open ? q.hide : q.show}</span>
            <span className="sr-only">{open ? q.hide : q.show}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
