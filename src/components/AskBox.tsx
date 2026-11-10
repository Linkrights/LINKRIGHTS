'use client';

// 첫 화면의 검색창입니다. 여기에 쓰면 AI 질문 페이지(/ask)로 넘어갑니다.
//
// 일부러 검색창 하나만 둡니다.
// 제목·안내문·예시는 질문 페이지에 그대로 있고, 첫 화면에서는 배너가 이미 같은 말을 하고 있어서
// 여기까지 글을 채우면 첫 화면이 길어져 정작 쓸 칸이 아래로 밀려났습니다.
//
// 개인정보 보호는 그대로입니다.
//   - 쓰는 동안 개인정보로 보이는 것을 찾아내고(findPersonalInfo),
//     있으면 넘어가기 전에 멈춰 세워 확인합니다. (PrivacyNotice)
//   - "개인정보를 적지 마세요" 안내문은 실제로 길게 쓰는 곳인 질문 페이지에 있습니다.
//   - 질문은 주소(URL)에 담지 않고 이 탭의 임시 저장소로만 넘깁니다.

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { PrivacyNotice } from './PrivacyNotice';
import { findPersonalInfo, removePersonalInfo } from './privacy-detect';
import { getMessages, type Locale } from '@/lib/i18n';

/** 홈에서 쓴 질문을 질문 페이지로 넘길 때 쓰는 이 탭의 임시 저장소 이름 (AskClient 가 읽고 바로 지웁니다) */
export const PENDING_QUESTION_KEY = 'linkrights:pending-question';

export function AskBox({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const router = useRouter();
  const [value, setValue] = useState('');
  const [blocked, setBlocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => findPersonalInfo(value), [value]);

  // 보내기를 멈췄으면 안내로 초점을 옮겨 무엇을 골라야 하는지 바로 알 수 있게 합니다.
  useEffect(() => {
    if (blocked) noticeRef.current?.focus();
  }, [blocked]);

  function go(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    // 질문 내용이 주소(URL)·방문 기록·서버 기록에 남지 않도록, 이 탭의 임시 저장소에 담아 질문 페이지로 넘깁니다.
    // 임시 저장소를 쓸 수 없는 브라우저에서도 질문을 주소에 넣지 않습니다. (질문 페이지에서 다시 적을 수 있어요)
    try {
      window.sessionStorage.setItem(PENDING_QUESTION_KEY, trimmed.slice(0, 500));
    } catch {
      // 저장하지 못해도 이동만 합니다.
    }
    router.push(`/${locale}/ask`);
  }

  function removeAndSend() {
    const cleaned = removePersonalInfo(value, matches);
    setValue(cleaned);
    setBlocked(false);
    if (cleaned) go(cleaned);
    else inputRef.current?.focus();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (matches.length > 0) setBlocked(true);
        else go(value);
      }}
    >
      <label htmlFor="hero-question" className="sr-only">
        {t.ask.questionHeading}
      </label>
      <div className="relative">
        <Icon
          name="search"
          size={20}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-300"
        />
        <input
          ref={inputRef}
          id="hero-question"
          type="text"
          value={value}
          maxLength={500}
          autoComplete="off"
          onChange={(event) => {
            setValue(event.target.value);
            setBlocked(false);
          }}
          placeholder={t.home.askPlaceholder}
          className="lr-input !rounded-full py-4 pl-12 pr-16 shadow-[0_10px_30px_rgba(14,37,79,0.14)]"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          aria-label={t.home.askButton}
          className="lr-btn-primary absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center !rounded-full !p-0 disabled:opacity-40"
        >
          <Icon name="arrow-right" size={20} />
        </button>
      </div>
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
    </form>
  );
}
