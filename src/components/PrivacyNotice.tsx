'use client';

// 질문 입력창 아래에 보이는 "개인정보로 보이는 내용이 있어요" 안내입니다.
//  - 글을 쓰는 중: 안내와 "해당 부분 지우기" 버튼
//  - 보내기를 눌렀을 때: 보내기를 멈추고 "해당 부분 지우고 보내기" / "직접 고치기" 중에서 고르게 합니다.
// 실수를 줄이기 위한 간단한 확인이며, 모든 개인정보를 찾아내지는 못한다고 함께 안내합니다.

import type { RefObject } from 'react';
import { Icon } from './Icon';
import type { PersonalInfoMatch } from './privacy-detect';
import type { Messages } from '@/lib/i18n';

export function PrivacyNotice({
  t,
  matches,
  blocked,
  noticeRef,
  onRemove,
  onRemoveAndSend,
  onEdit,
}: {
  t: Messages;
  matches: PersonalInfoMatch[];
  /** 보내기를 눌렀는데 개인정보로 보이는 내용이 있어 멈춘 상태 */
  blocked: boolean;
  noticeRef?: RefObject<HTMLDivElement | null>;
  onRemove: () => void;
  onRemoveAndSend: () => void;
  onEdit: () => void;
}) {
  const types = [...new Set(matches.map((match) => match.type))].map((type) => t.ask.privacyTypes[type]).join(', ');

  return (
    // 안내가 나타나면 화면낭독기가 읽도록 항상 있는 알림 영역 안에 그립니다.
    <div aria-live="polite">
      {matches.length > 0 && (
        <div
          ref={noticeRef}
          tabIndex={-1}
          className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-warm-500)] bg-warm-100 p-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <p className="flex items-start gap-2 text-[15px] font-bold text-ink-900">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0" /> <span>{t.ask.privacyDetectedTitle}</span>
          </p>{' '}
          <p className="mt-1 text-sm leading-relaxed text-ink-700">{t.ask.privacyDetectedBody.replace('{types}', types)}</p>
          {blocked && <p className="mt-1.5 text-sm font-semibold text-ink-900">{t.ask.privacyDetectedSubmit}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {blocked ? (
              <>
                <button type="button" onClick={onRemoveAndSend} className="lr-btn lr-btn-primary lr-btn-sm">
                  {t.ask.privacyRemoveAndSend}
                </button>
                <button type="button" onClick={onEdit} className="lr-btn lr-btn-ghost lr-btn-sm">
                  {t.ask.privacyEdit}
                </button>
              </>
            ) : (
              <button type="button" onClick={onRemove} className="lr-btn lr-btn-ghost lr-btn-sm">
                {t.ask.privacyRemove}
              </button>
            )}
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">{t.ask.privacyDetectNote}</p>
        </div>
      )}
    </div>
  );
}
