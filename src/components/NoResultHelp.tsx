// "아직 이 상황에 대한 자료가 충분하지 않아요" 안내입니다.
// AI 답변에 근거 자료가 없을 때, 답변을 만들지 못했을 때, 검색 결과가 없을 때 "다음에 할 수 있는 일"을 보여줍니다.
//  - 네 가지 행동 버튼 (NoResultActions): 비슷한 권리정보 / 분야별 권리정보 / 지역별 도움받을 곳 / 질문 바꿔 다시 묻기
//    "질문 바꿔 다시 묻기"는 등록된 권리정보에서 고른 추천 질문을 먼저 펼쳐 보여줍니다.
//  - 비슷한 권리정보: 서버가 등록 권리정보 중에서 찾은 링크만
//  - 자료 추가 요청: content/site.json 의 공식 이메일로 여는 메일 (주소가 없으면 보여주지 않음)
//  - 누구나 상담할 수 있는 청소년 상담: 등록된 전국 청소년 상담 기관 (AI가 고른 기관이 아님)
// 서버 화면(검색)과 브라우저 화면(AI 답변) 양쪽에서 씁니다. (함수는 브라우저 화면에서만 넘깁니다)

import Link from 'next/link';
import { Icon } from './Icon';
import { NoResultActions } from './NoResultActions';
import { OrgCard } from './OrgCard';
import type { Locale, Messages } from '@/lib/i18n';
import type { Organization } from '@/lib/types';

export function NoResultHelp({
  t,
  locale,
  title,
  body,
  links = [],
  category,
  generalHelp = [],
  onRetry,
  askHref,
  suggestions = [],
  onSuggestion,
  materialHref,
}: {
  t: Messages;
  locale: Locale;
  title: string;
  body?: string;
  /** 등록 권리정보 링크 */
  links?: { id: string; title: string; href: string }[];
  /** 관련 분야 (등록된 분야만) */
  category?: { href: string; name: string };
  /** 누구나 이용할 수 있는 청소년 상담 기관 (등록 기관) */
  generalHelp?: Organization[];
  /** AI 질문 화면: 질문을 바꿔 다시 물어보기 */
  onRetry?: () => void;
  /** 검색 화면: 내 상황 물어보기 페이지 */
  askHref?: string;
  /** 바꿔 물어볼 수 있는 질문 (등록된 권리정보의 문장만) */
  suggestions?: string[];
  onSuggestion?: (text: string) => void;
  /** 자료 추가 요청 메일 (mailto:). 없으면 보여주지 않습니다. */
  materialHref?: string;
}) {
  const a = t.answerUi;
  const similarId = 'no-result-similar';
  const linkClass = 'lr-link inline-flex items-start gap-1.5 text-[15px] font-semibold';

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-surface-soft p-5 sm:p-6">
      <h3 className="text-lg font-extrabold leading-snug text-ink-900">{title}</h3>
      {body && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{body}</p>}

      <p className="mt-5 text-sm font-bold text-brand-700">{a.nextTitle}</p>
      <div className="mt-3">
        <NoResultActions
          labels={{
            similar: a.similar,
            browseRights: category ? a.categoryAll.replace('{category}', category.name) : a.browseRights,
            region: a.region,
            retry: a.retry,
            retryHint: a.retryHint,
            retryNote: a.retryNote,
            retryEdit: a.retryEdit,
            ask: a.ask,
          }}
          similarHref={links.length > 0 ? `#${similarId}` : undefined}
          rightsHref={category ? category.href : `/${locale}/rights`}
          organizationsHref={`/${locale}/organizations`}
          askHref={askHref}
          suggestions={suggestions}
          onSuggestion={onSuggestion}
          onRetry={onRetry}
        />
      </div>

      {/* 비슷한 권리정보 (서버가 등록 권리정보에서 찾은 링크만) */}
      {links.length > 0 && (
        <div id={similarId} className="mt-6 scroll-mt-24">
          <p className="text-[15px] font-bold text-ink-900">{a.similar}</p>
          <ul className="mt-2 space-y-2">
            {links.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className={linkClass}>
                  <Icon name="arrow-right" size={16} className="mt-1 shrink-0" /> <span>{item.title}</span>
                </Link>
              </li>
            ))}
            {category && (
              <li>
                <Link href={`/${locale}/rights`} className={linkClass}>
                  <Icon name="arrow-right" size={16} className="mt-1 shrink-0" /> <span>{a.browseRights}</span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* 필요한 자료가 없다면: 공식 이메일로 자료 추가 요청 */}
      {materialHref && (
        <div className="mt-6 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white p-4">
          <p className="text-[15px] font-bold text-ink-900">{t.materialRequest.noneTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">{t.materialRequest.body}</p>
          <a href={materialHref} className="lr-btn lr-btn-ghost lr-btn-sm lr-press mt-3">
            <Icon name="message" size={16} /> {t.materialRequest.cta}
          </a>
        </div>
      )}

      {generalHelp.length > 0 && (
        <div className="mt-6 border-t border-[var(--color-line)] pt-5">
          <p className="text-[15px] font-bold text-ink-900">{a.generalTitle}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {generalHelp.map((org) => (
              <OrgCard key={org.id} org={org} locale={locale} compact />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
