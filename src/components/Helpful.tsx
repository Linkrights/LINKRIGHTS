'use client';

// "이 답변(정보)이 도움이 되었나요?" — 가볍게 한 번 누르는 평가 버튼입니다.
//
// - 누르면 도움됨/아쉬움과 화면 언어, 등록된 분야·권리정보 id 만 보냅니다.
//   질문 내용이나 답변 내용은 보내지 않습니다. (src/app/api/feedback/route.ts 참고)
// - 한 번 누르면 "고맙습니다" 로 바뀌고, 같은 항목은 이 브라우저에서 다시 묻지 않습니다.
// - 보내기에 실패해도 화면에는 그대로 감사 인사를 보여줍니다. (이용자가 할 일이 없는 일이므로)

import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { getMessages, type Locale } from '@/lib/i18n';

const STORAGE_PREFIX = 'linkrights:helpful:';

export function Helpful({
  locale,
  kind,
  topic,
  evidence,
  /** 같은 페이지에서 여러 번 묻지 않도록 구분하는 이름 (권리정보 id, 답변 순번 등) */
  id,
  className = '',
}: {
  locale: Locale;
  kind: 'ai' | 'article';
  topic?: string;
  evidence?: 'found' | 'possible' | 'none';
  id: string;
  className?: string;
}) {
  const t = getMessages(locale);
  const a = t.helpful;
  const [done, setDone] = useState(false);
  const storageKey = `${STORAGE_PREFIX}${kind}:${id}`;

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey)) setDone(true);
    } catch {
      // 저장소를 쓸 수 없으면 매번 물어봅니다.
    }
  }, [storageKey]);

  function send(helpful: boolean) {
    setDone(true);
    try {
      window.localStorage.setItem(storageKey, helpful ? 'yes' : 'no');
    } catch {
      // 저장소를 쓸 수 없어도 보내기는 그대로 합니다.
    }
    void fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ helpful, kind, locale, topic, evidence }),
      keepalive: true,
    }).catch(() => {
      // 보내지 못해도 이용자가 할 일은 없습니다.
    });
  }

  if (done) {
    return (
      <p
        aria-live="polite"
        className={`flex items-center gap-2 text-[15px] font-semibold text-brand-800 ${className}`}
      >
        <Icon name="check" size={18} className="shrink-0 text-brand-600" /> {a.thanks}
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      <p className="text-[15px] font-semibold text-ink-900">{a.question}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => send(true)} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
          <Icon name="thumb-up" size={16} /> {a.yes}
        </button>
        <button type="button" onClick={() => send(false)} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
          <Icon name="thumb-down" size={16} /> {a.no}
        </button>
      </div>
      <p className="w-full text-[13px] leading-relaxed text-ink-500">{a.note}</p>
    </div>
  );
}
