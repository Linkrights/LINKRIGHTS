// "아직 이 상황에 대한 자료가 충분하지 않아요" 안내입니다.
// AI 답변에 근거 자료가 없을 때, 답변을 만들지 못했을 때, 권리정보 검색 결과가 없을 때 "다음에 할 수 있는 일"을 보여줍니다.
//  - 비슷한 권리정보: 서버가 등록 권리정보 중에서 찾은 링크만
//  - 분야 권리정보, 지역을 골라 도움받을 곳 찾기
//  - 누구나 상담할 수 있는 청소년 상담: content/organizations.json 의 청소년 상담 기관(AI가 고른 기관이 아님)
//  - 다시 물어보기
// 상태(hook)를 쓰지 않으므로 서버 화면과 브라우저 화면 양쪽에서 씁니다.

import Link from 'next/link';
import { Icon } from './Icon';
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
}) {
  const a = t.answerUi;
  const linkClass = 'lr-link inline-flex items-start gap-1.5 text-[15px] font-semibold';

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-surface-soft p-5 sm:p-6">
      <h3 className="text-lg font-extrabold leading-snug text-ink-900">{title}</h3>
      {body && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{body}</p>}

      <p className="mt-5 text-sm font-bold text-brand-700">{a.nextTitle}</p>
      <div className="mt-3 grid gap-6 md:grid-cols-2">
        <div>
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
                <Link href={category.href} className={linkClass}>
                  <Icon name="arrow-right" size={16} className="mt-1 shrink-0" />{' '}
                  <span>{a.categoryAll.replace('{category}', category.name)}</span>
                </Link>
              </li>
            )}
            <li>
              <Link href={`/${locale}/rights`} className={linkClass}>
                <Icon name="arrow-right" size={16} className="mt-1 shrink-0" /> <span>{a.browseRights}</span>
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[15px] font-bold text-ink-900">{a.region}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={`/${locale}/organizations`} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
              <Icon name="map-pin" size={16} /> {t.nav.organizations}
            </Link>
            {onRetry && (
              <button type="button" onClick={onRetry} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
                {a.retry}
              </button>
            )}
            {askHref && (
              <Link href={askHref} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
                {a.ask} <Icon name="arrow-right" size={16} />
              </Link>
            )}
          </div>
        </div>
      </div>

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
