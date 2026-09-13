'use client';

// 홈 화면 맨 위에 있는 질문 입력창입니다.
// 여기서 질문을 쓰면 AI 질문 페이지(/ask)로 이동합니다.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from './Icon';
import { getMessages, type Locale } from '@/lib/i18n';

/** 홈에서 쓴 질문을 질문 페이지로 넘길 때 쓰는 이 탭의 임시 저장소 이름 (AskClient 가 읽고 바로 지웁니다) */
export const PENDING_QUESTION_KEY = 'linkrights:pending-question';

export function AskBox({ locale, examples }: { locale: Locale; examples: string[] }) {
  const t = getMessages(locale);
  const router = useRouter();
  const [value, setValue] = useState('');

  function go(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    // 질문 내용이 주소(URL)와 방문 기록에 남지 않도록, 이 탭의 임시 저장소에 담아 질문 페이지로 넘깁니다.
    try {
      window.sessionStorage.setItem(PENDING_QUESTION_KEY, trimmed.slice(0, 500));
      router.push(`/${locale}/ask`);
    } catch {
      // 임시 저장소를 쓸 수 없는 브라우저에서만 예전처럼 주소로 넘깁니다. (질문 페이지가 주소에서 바로 지웁니다)
      router.push(`/${locale}/ask?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          go(value);
        }}
        className="flex flex-col gap-2 rounded-2xl border border-[var(--color-line)] bg-white p-2 shadow-sm sm:flex-row sm:items-center"
      >
        <label htmlFor="hero-question" className="sr-only">
          {t.ask.title}
        </label>
        <input
          id="hero-question"
          type="text"
          value={value}
          maxLength={500}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t.home.askPlaceholder}
          className="min-h-[52px] flex-1 rounded-xl bg-transparent px-4 text-base text-ink-900 outline-none placeholder:text-ink-300"
        />
        <button type="submit" className="lr-btn lr-btn-primary shrink-0">
          <Icon name="sparkles" size={18} />
          {t.home.askButton}
        </button>
      </form>

      {examples.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink-500">{t.home.exampleLabel}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {examples.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => go(example)}
                  className="rounded-full border border-[var(--color-line)] bg-white px-3.5 py-2 text-left text-sm text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
