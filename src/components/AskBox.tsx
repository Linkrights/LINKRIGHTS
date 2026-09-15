'use client';

// 홈 화면의 "내 상황을 말해보는 공간"입니다.
// 여기서 질문을 쓰면 AI 질문 페이지(/ask)로 이동합니다.
// 개인정보로 보이는 내용이 있으면 이동하기 전에 확인합니다. (PrivacyNotice 참고)

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { PrivacyNotice } from './PrivacyNotice';
import { findPersonalInfo, removePersonalInfo } from './privacy-detect';
import { getMessages, type Locale } from '@/lib/i18n';

/** 홈에서 쓴 질문을 질문 페이지로 넘길 때 쓰는 이 탭의 임시 저장소 이름 (AskClient 가 읽고 바로 지웁니다) */
export const PENDING_QUESTION_KEY = 'linkrights:pending-question';

export function AskBox({ locale, examples }: { locale: Locale; examples: string[] }) {
  const t = getMessages(locale);
  const router = useRouter();
  const [value, setValue] = useState('');
  const [blocked, setBlocked] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => findPersonalInfo(value), [value]);

  // 보내기를 멈췄으면 안내로 초점을 옮겨 무엇을 골라야 하는지 바로 알 수 있게 합니다.
  useEffect(() => {
    if (blocked) noticeRef.current?.focus();
  }, [blocked]);

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

  function removeAndSend() {
    const cleaned = removePersonalInfo(value, matches);
    setValue(cleaned);
    setBlocked(false);
    if (cleaned) go(cleaned);
    else inputRef.current?.focus();
  }

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (matches.length > 0) setBlocked(true);
          else go(value);
        }}
      >
        <label htmlFor="hero-question" className="block">
          <span className="block text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
            {t.ask.questionHeading}
          </span>{' '}
          <span className="mt-1.5 block text-[15px] leading-relaxed text-ink-500">{t.ask.questionHint}</span>
        </label>
        {/* 개인정보 입력 금지 안내: 쓰기 전에 먼저 보이도록 입력창 위에 둡니다 */}
        <p className="mt-3 flex items-start gap-2 rounded-[var(--radius-control)] bg-brand-50 px-3 py-2 text-sm font-medium leading-relaxed text-brand-800">
          <Icon name="shield" size={16} className="mt-0.5 shrink-0" /> <span>{t.ask.privacyShort}</span>
        </p>
        <textarea
          ref={inputRef}
          id="hero-question"
          value={value}
          rows={3}
          maxLength={500}
          onChange={(event) => {
            setValue(event.target.value);
            setBlocked(false);
          }}
          placeholder={t.home.askPlaceholder}
          className="lr-input mt-4 resize-none"
        />
        <PrivacyNotice
          t={t}
          matches={matches}
          blocked={blocked}
          noticeRef={noticeRef}
          onRemove={() => {
            setValue(removePersonalInfo(value, matches));
            inputRef.current?.focus();
          }}
          onRemoveAndSend={removeAndSend}
          onEdit={() => {
            setBlocked(false);
            inputRef.current?.focus();
          }}
        />
        <button type="submit" disabled={!value.trim()} className="lr-btn lr-btn-primary lr-btn-lg mt-4 w-full">
          {t.home.askButton} <Icon name="arrow-right" size={18} />
        </button>
      </form>

      {examples.length > 0 && (
        <div className="mt-6 border-t border-[var(--color-line)] pt-5">
          <p className="text-sm font-semibold text-ink-500">{t.home.exampleLabel}</p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {examples.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  onClick={() => go(example)}
                  className="rounded-full border border-[var(--color-line)] bg-surface-soft px-3.5 py-2 text-left text-[15px] text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
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
