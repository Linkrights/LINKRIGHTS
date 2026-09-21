'use client';

// "자료가 충분하지 않아요" 아래의 네 가지 행동 버튼입니다. (NoResultHelp 안에서 씁니다)
//   [비슷한 권리정보 보기] [분야별 권리정보 보기] [지역별 도움받을 곳 찾기] [질문을 바꿔서 다시 물어보기]
//
// "질문을 바꿔서 다시 물어보기"를 누르면 빈 입력창으로만 보내지 않고, 바꿔 물어볼 수 있는 질문을 먼저 펼쳐 보여줍니다.
//  - 추천 질문은 서버가 등록된 권리정보에 실제로 적혀 있는 문장(상황 문장·제목)에서만 골라 보낸 것입니다.
//    AI가 새로 만든 문장이나 법적 판단이 아니며, 누르면 그 문장으로 새로 물어봅니다.
//  - 추천 질문이 없으면 바로 입력창으로 이동해 적었던 질문을 고칠 수 있게 합니다.
// 검색 화면처럼 다시 물어볼 수 없는 곳에서는 "AI에게 상황 설명하기" 링크를 보여줍니다.

import Link from 'next/link';
import { useId, useState } from 'react';
import { Icon } from './Icon';

export function NoResultActions({
  labels,
  similarHref,
  rightsHref,
  organizationsHref,
  askHref,
  suggestions = [],
  onSuggestion,
  onRetry,
}: {
  labels: {
    similar: string;
    browseRights: string;
    region: string;
    retry: string;
    retryHint: string;
    retryNote: string;
    retryEdit: string;
    ask: string;
  };
  /** 비슷한 권리정보 목록으로 가는 주소 (없으면 이 버튼을 빼요) */
  similarHref?: string;
  rightsHref: string;
  organizationsHref: string;
  /** 검색 화면: AI 질문 페이지 */
  askHref?: string;
  /** 등록된 권리정보에서 고른 바꿔 물어볼 질문 */
  suggestions?: string[];
  onSuggestion?: (text: string) => void;
  onRetry?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const canSuggest = Boolean(onSuggestion) && suggestions.length > 0;
  const button =
    'lr-btn lr-btn-ghost lr-press w-full justify-start gap-2 bg-white text-left whitespace-normal leading-snug';

  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {similarHref && (
          <li>
            <a href={similarHref} className={button}>
              <Icon name="book" size={18} className="shrink-0 text-brand-600" /> <span>{labels.similar}</span>
            </a>
          </li>
        )}
        <li>
          <Link href={rightsHref} className={button}>
            <Icon name="search" size={18} className="shrink-0 text-brand-600" /> <span>{labels.browseRights}</span>
          </Link>
        </li>
        <li>
          <Link href={organizationsHref} className={button}>
            <Icon name="map-pin" size={18} className="shrink-0 text-brand-600" /> <span>{labels.region}</span>
          </Link>
        </li>
        {onRetry ? (
          <li>
            <button
              type="button"
              aria-expanded={canSuggest ? open : undefined}
              aria-controls={canSuggest ? panelId : undefined}
              onClick={() => (canSuggest ? setOpen((value) => !value) : onRetry())}
              className={button}
            >
              <Icon name="message" size={18} className="shrink-0 text-brand-600" /> <span>{labels.retry}</span>
            </button>
          </li>
        ) : (
          askHref && (
            <li>
              <Link href={askHref} className={button}>
                <Icon name="sparkles" size={18} className="shrink-0 text-brand-600" /> <span>{labels.ask}</span>
              </Link>
            </li>
          )
        )}
      </ul>

      {canSuggest && open && (
        <div id={panelId} className="mt-3 rounded-[var(--radius-control)] border border-brand-200 bg-white p-4">
          <p className="text-[15px] font-bold text-ink-900">{labels.retryHint}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">{labels.retryNote}</p>
          <ul className="mt-3 space-y-2">
            {suggestions.map((text) => (
              <li key={text}>
                <button
                  type="button"
                  onClick={() => onSuggestion?.(text)}
                  className="lr-press flex w-full items-start gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-surface-soft px-3.5 py-2.5 text-left text-[15px] leading-relaxed text-ink-900 transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  <Icon name="arrow-right" size={16} className="mt-1 shrink-0 text-brand-600" /> <span>{text}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onRetry} className="lr-link mt-3 text-[15px] font-semibold">
            {labels.retryEdit}
          </button>
        </div>
      )}
    </div>
  );
}
