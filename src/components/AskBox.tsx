'use client';

// 홈 화면 맨 위에 있는 질문 입력창입니다.
// 여기서 질문을 쓰면 AI 질문 페이지(/ask)로 이동합니다.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from './Icon';
import { getMessages, type Locale } from '@/lib/i18n';

export function AskBox({ locale, examples }: { locale: Locale; examples: string[] }) {
  const t = getMessages(locale);
  const router = useRouter();
  const [value, setValue] = useState('');

  function go(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    router.push(`/${locale}/ask?q=${encodeURIComponent(trimmed)}`);
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
