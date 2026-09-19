'use client';

// 질문 게시판(Q&A) 목록입니다.
//
// - 공지는 항상 맨 위에 고정하고, 질문은 최근에 올라온 순서로 보여줍니다.
// - 제목·내용·분야로 바로 찾을 수 있는 검색창이 있습니다. (검색어는 주소에도, 서버에도 저장하지 않습니다)
// - 글은 운영팀이 검토해 올린 것만 보입니다. 사이트에서 바로 글을 저장하는 기능은 없습니다.
//   질문은 이메일로 받고, 개인정보를 뺀 뒤 답과 함께 올립니다. (content/qna.json 참고)

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { textMatchesQuery } from '@/lib/searchText';
import { getMessages, type Locale } from '@/lib/i18n';

export interface QnaRow {
  id: string;
  href: string;
  notice: boolean;
  title: string;
  author: string;
  date: string;
  /** 분야 이름 (없으면 표시하지 않습니다) */
  category?: string;
  answered: boolean;
  /** 검색에 쓰는 글: 제목 + 질문 + 답 + 분야 */
  search: string;
}

export function QnaBoard({ locale, rows }: { locale: Locale; rows: QnaRow[] }) {
  const t = getMessages(locale);
  const a = t.qna;
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const text = query.trim();
    if (!text) return rows;
    // 공지는 안내 글이므로 검색할 때도 함께 남겨 둡니다.
    return rows.filter((row) => row.notice || textMatchesQuery(row.search, text));
  }, [rows, query]);

  const questionCount = visible.filter((row) => !row.notice).length;

  return (
    <div>
      {/* 검색 */}
      <form role="search" onSubmit={(event) => event.preventDefault()} className="max-w-2xl">
        <label htmlFor="qna-search" className="block text-[15px] font-bold text-ink-900">
          {a.searchLabel}
        </label>
        <span className="relative mt-2 flex items-center">
          <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 text-ink-500" />
          <input
            id="qna-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={60}
            placeholder={a.searchPlaceholder}
            autoComplete="off"
            enterKeyHint="search"
            className="lr-input pl-10"
          />
        </span>
      </form>

      <p aria-live="polite" className="mt-4 text-[15px] font-semibold text-ink-900">
        {a.count.replace('{n}', String(questionCount))}
      </p>

      {/* 목록: 넓은 화면에서는 한 줄, 휴대폰에서는 두 줄로 접힙니다. */}
      <ul className="mt-4 divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
        {visible.map((row) => (
          <li key={row.id} className={row.notice ? 'bg-surface-soft' : ''}>
            <Link
              href={row.href}
              className="flex flex-col gap-1.5 px-4 py-4 transition-colors hover:bg-brand-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
            >
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                {row.notice && (
                  <span className="shrink-0 rounded-full bg-navy-900 px-2.5 py-0.5 text-xs font-bold text-white">
                    {a.notice}
                  </span>
                )}
                {!row.notice && row.category && (
                  <span className="shrink-0 text-[13px] font-semibold text-brand-700">{row.category}</span>
                )}
                <span className="min-w-0 text-base font-bold leading-snug text-ink-900">{row.title}</span>
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
                <span>{row.author}</span>
                <span>{row.date}</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    row.answered ? 'text-brand-700' : 'text-ink-500'
                  }`}
                >
                  <Icon name={row.answered ? 'check' : 'message'} size={14} />
                  {row.answered ? a.answered : a.waiting}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {questionCount === 0 && (
        <p className="mt-4 rounded-[var(--radius-control)] bg-surface-soft px-4 py-3.5 text-[15px] leading-relaxed text-ink-700">
          {query ? a.emptySearch : a.empty}
        </p>
      )}
    </div>
  );
}
