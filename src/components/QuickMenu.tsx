'use client';

// 화면 오른쪽에 따라다니는 빠른 이동 메뉴입니다. (PC) 휴대폰에서는 아래쪽 띠로 바뀝니다.
//
// 왜 두나요?
//   어느 화면을 보고 있든 "도움받을 곳 · 프로그램 · AI 질문 · 커뮤니티" 네 가지로 바로 갈 수 있게 하기 위해서입니다.
//   네 가지는 LINKRIGHTS에서 실제로 "행동"이 일어나는 곳이고, 나머지는 읽는 화면입니다.
//
// 지키는 것
//  - 글을 읽는 데 방해가 되지 않도록 본문 폭(72rem) 바깥에 둡니다. 화면이 좁으면 아래쪽 띠로 바뀝니다.
//  - 첫 화면(welcome)과 관리자 화면에는 보이지 않습니다.
//  - 접어 두면 그 상태를 이 브라우저에 기억합니다. (서버로 보내지 않습니다)
//  - 키보드로도 쓸 수 있고, 화면낭독기에는 "빠른 이동" 메뉴로 읽힙니다.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { getMessages, type Locale } from '@/lib/i18n';

const STORAGE_KEY = 'linkrights:quick-menu';

export function QuickMenu({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const q = t.quickMenu;
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);

  // 접어 둔 상태를 기억합니다. (못 읽어도 그냥 펼친 채로 보여 줍니다)
  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(STORAGE_KEY) !== 'closed');
    } catch {
      /* 저장소를 쓸 수 없으면 펼친 채로 둡니다 */
    }
    setReady(true);
  }, []);

  function change(next: boolean) {
    setOpen(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'open' : 'closed');
    } catch {
      /* 기억하지 못해도 이번 화면에서는 동작합니다 */
    }
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
    <nav aria-label={q.title} className="lr-quick" data-ready={ready ? 'yes' : 'no'}>
      {/* 휴대폰: 아래쪽 띠 — 네 칸을 똑같이 나눠 글자와 함께 보여줍니다. (접기 단추는 두지 않습니다) */}
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

      {/* PC: 오른쪽에 세로로 */}
      <div className="lr-quick-rail hidden lg:flex">
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
        <button
          type="button"
          onClick={() => change(!open)}
          aria-expanded={open}
          className="lr-quick-toggle group"
        >
          <Icon name={open ? 'close' : 'menu'} size={open ? 18 : 22} />
          <span className="lr-quick-tip">{open ? q.hide : q.show}</span>
          <span className="sr-only">{open ? q.hide : q.show}</span>
        </button>
      </div>
    </nav>
  );
}
