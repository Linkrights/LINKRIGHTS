'use client';

// 자주 묻는 질문 목록입니다. (FAQ 페이지에서 사용)
//
// - 검색: 질문과 답 안의 낱말로 바로 거릅니다. 검색어는 주소에 넣지 않고 서버로도 보내지 않습니다.
//   (권리정보를 찾는 "권리정보 검색" /rights/search 와는 별개입니다)
// - 카테고리: 질문이 있는 카테고리만 버튼으로 보여줍니다.
// - 펼치기: 한 번에 하나의 질문만 펼쳐집니다. 답은 짧은 등장 효과(lr-appear)로 나타나며,
//   움직임 줄이기 설정에서는 전역 규칙으로 효과가 꺼집니다.
// - 위기·긴급 질문은 빨간 톤으로 구분하고, 등록된 기관의 전화 버튼과 긴급 도움 페이지 링크를 함께 보여줍니다.
// - 주소 끝에 #faq-질문id 를 붙이면 그 질문이 펼쳐진 채로 열립니다.

import Link from 'next/link';
import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { Icon } from './Icon';
import type { FaqCategoryId } from '@/lib/types';

export interface FaqItemView {
  id: string;
  category: FaqCategoryId;
  q: string;
  a: string;
  /** 등록 기관의 이름과 번호 (전화 버튼) */
  contacts: { id: string; name: string; phone: string }[];
}

export interface FaqCategoryView {
  id: FaqCategoryId;
  /** 버튼에 쓰는 짧은 이름 */
  label: string;
  /** 목록 제목 */
  title: string;
}

export interface FaqLabels {
  intro: string;
  searchPlaceholder: string;
  searchHint: string;
  rightsSearchNote: string;
  rightsSearch: string;
  categoriesLabel: string;
  filterAll: string;
  resultCount: string;
  noResultsTitle: string;
  noResultsBody: string;
  clearSearch: string;
  askCta: string;
  call: string;
  emergencyMore: string;
}

function normalize(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function FaqBrowser({
  items,
  categories,
  labels,
  askHref,
  rightsSearchHref,
  emergencyHref,
}: {
  items: FaqItemView[];
  categories: FaqCategoryView[];
  labels: FaqLabels;
  askHref: string;
  rightsSearchHref: string;
  emergencyHref: string;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<FaqCategoryId | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // 주소 끝의 #faq-질문id 로 들어오면 그 질문을 펼치고 그 위치로 이동합니다.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace(/^#faq-/, ''));
    if (id && items.some((item) => item.id === id)) {
      setOpenId(id);
      document.getElementById(`faq-${id}`)?.scrollIntoView({ block: 'center' });
    }
  }, [items]);

  const q = normalize(query);
  const matches = useMemo(() => {
    if (!q) return items;
    const words = q.split(' ');
    const compactQuery = q.replace(/ /g, '');
    return items.filter((item) => {
      const text = normalize(`${item.q} ${item.a}`);
      return words.every((word) => text.includes(word)) || text.replace(/ /g, '').includes(compactQuery);
    });
  }, [items, q]);

  const visible = active ? matches.filter((item) => item.category === active) : matches;
  const groups = categories
    .map((category) => ({ ...category, items: visible.filter((item) => item.category === category.id) }))
    .filter((group) => group.items.length > 0);

  // 검색 결과가 하나뿐이면 바로 펼쳐 줍니다.
  useEffect(() => {
    if (q && matches.length === 1) setOpenId(matches[0].id);
  }, [q, matches]);

  function search(value: string) {
    setQuery(value);
    // 검색할 때는 모든 카테고리에서 찾습니다. (선택한 카테고리 때문에 결과가 없어 보이지 않도록)
    if (value.trim()) setActive(null);
  }

  function toggle(id: string, event: SyntheticEvent<HTMLDetailsElement>) {
    const isOpen = event.currentTarget.open;
    setOpenId((current) => (isOpen ? id : current === id ? null : current));
  }

  const chips: { key: FaqCategoryId | null; label: string }[] = [
    { key: null, label: labels.filterAll },
    ...categories.map((category) => ({ key: category.id, label: category.label })),
  ];

  return (
    <div>
      {/* FAQ 검색 (페이지 안에서만 거르는 검색) */}
      <div className="lr-card p-5 sm:p-6">
        <label htmlFor="faq-search" className="block text-lg font-extrabold tracking-tight text-ink-900">
          {labels.intro}
        </label>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{labels.searchHint}</p>
        <div role="search" className="relative mt-3 flex items-center">
          <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 text-ink-500" />
          <input
            id="faq-search"
            type="search"
            value={query}
            maxLength={60}
            autoComplete="off"
            enterKeyHint="search"
            onChange={(event) => search(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="lr-input pl-10"
          />
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-500">
          <span>{labels.rightsSearchNote}</span>{' '}
          <Link href={rightsSearchHref} className="lr-link inline-flex items-center gap-1 font-semibold">
            {labels.rightsSearch} <Icon name="arrow-right" size={14} />
          </Link>
        </p>
      </div>

      {/* 카테고리 */}
      <div role="group" aria-label={labels.categoriesLabel} className="mt-6 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const pressed = active === chip.key;
          return (
            <button
              key={chip.key ?? 'all'}
              type="button"
              aria-pressed={pressed}
              onClick={() => setActive(chip.key)}
              className={`lr-press rounded-full border px-4 py-2 text-[15px] font-semibold transition-colors ${
                pressed
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-[var(--color-line)] bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* 검색 결과 수 (화면낭독기에도 알려줍니다) */}
      <p aria-live="polite" className="mt-4 min-h-5 text-sm font-semibold text-ink-500">
        {q ? labels.resultCount.replace('{n}', String(visible.length)) : ''}
      </p>

      {groups.length === 0 ? (
        <div className="lr-card mt-2 p-6 text-center">
          <p className="text-lg font-bold text-ink-900">{labels.noResultsTitle}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{labels.noResultsBody}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => search('')} className="lr-btn lr-btn-ghost lr-press">
              {labels.clearSearch}
            </button>
            <Link href={askHref} className="lr-btn lr-btn-primary lr-press">
              {labels.askCta} <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-8">
          {groups.map((group) => {
            const emergency = group.id === 'emergency';
            return (
              <section key={group.id} aria-labelledby={`faq-cat-${group.id}`}>
                <h2
                  id={`faq-cat-${group.id}`}
                  className={`flex items-center gap-2 text-lg font-extrabold ${
                    emergency ? 'text-[var(--color-danger-700)]' : 'text-ink-900'
                  }`}
                >
                  {emergency && <Icon name="alert" size={18} />}
                  {group.title}
                </h2>
                <ul
                  className={`mt-3 overflow-hidden rounded-[var(--radius-card)] border ${
                    emergency
                      ? 'divide-y divide-[var(--color-danger-200)] border-[var(--color-danger-200)] bg-[var(--color-danger-50)]'
                      : 'divide-y divide-[var(--color-line)] border-[var(--color-line)] bg-white shadow-[var(--shadow-card)]'
                  }`}
                >
                  {group.items.map((item) => (
                    <li key={item.id} id={`faq-${item.id}`} className="scroll-mt-24">
                      <details open={openId === item.id} onToggle={(event) => toggle(item.id, event)} className="group">
                        <summary
                          className={`flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-left text-base font-bold leading-snug text-ink-900 sm:px-6 [&::-webkit-details-marker]:hidden ${
                            emergency ? 'hover:bg-white/60' : 'hover:bg-surface-soft'
                          }`}
                        >
                          {/* 질문은 왼쪽 정렬, 아이콘은 오른쪽 첫 줄에 고정 (두 줄이 되어도 겹치지 않게) */}
                          <span className="min-w-0 flex-1">{item.q}</span>
                          <span
                            className="grid h-[22px] w-5 shrink-0 place-items-center text-ink-300 transition-transform duration-200 group-open:rotate-180"
                            aria-hidden="true"
                          >
                            ▾
                          </span>
                        </summary>
                        <div className="lr-appear px-5 pb-5 sm:px-6">
                          <p className="text-[15px] leading-relaxed text-ink-700">{item.a}</p>
                          {item.contacts.length > 0 && (
                            <ul className="mt-3 flex flex-wrap gap-2">
                              {item.contacts.map((contact) => (
                                <li key={contact.id}>
                                  <a
                                    href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                                    className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-danger-200)] bg-white px-3.5 py-2 text-[15px] font-bold text-[var(--color-danger-700)] transition-colors hover:border-[var(--color-danger-600)]"
                                  >
                                    {contact.name}
                                    <span className="text-sm font-semibold">{labels.call}</span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                          {emergency && (
                            <Link
                              href={emergencyHref}
                              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-danger-700)] underline underline-offset-2"
                            >
                              {labels.emergencyMore} <Icon name="arrow-right" size={14} />
                            </Link>
                          )}
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
