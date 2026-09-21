// 긴급 안내 카드입니다. 일반 답변과 확실히 구분되도록 붉은 계열로 표시합니다.
// 여기에 들어가는 글과 번호는 content/emergency.json + content/organizations.json 에서만 옵니다.
// 번호는 휴대폰에서 바로 전화가 걸리도록 tel: 로 연결하고,
// PC처럼 전화를 걸기 어려운 곳을 위해 등록된 공식 신고·안내 페이지(report_url, 없으면 website)를 "공식 사이트"로 함께 둡니다.
// (주소가 등록되지 않은 기관은 전화 버튼만 보여줍니다. 검색 페이지로 보내거나 주소를 짐작해 넣지 않습니다)

import { Icon } from './Icon';
import { getMessages, pick, type Locale } from '@/lib/i18n';
import type { Organization } from '@/lib/types';

export function EmergencyCard({
  locale,
  title,
  message,
  steps,
  note,
  organizations,
}: {
  locale: Locale;
  title: string;
  message: string;
  steps: string[];
  note: string;
  organizations: Organization[];
}) {
  const t = getMessages(locale);

  return (
    <section
      role="alert"
      className="rounded-[var(--radius-card)] border border-[var(--color-danger-200)] bg-[var(--color-danger-50)] p-5 sm:p-7"
    >
      <div className="flex items-start gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--color-danger-600)] text-white">
          <Icon name="alert" size={22} />
        </span>{' '}
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold leading-snug text-[var(--color-danger-700)] sm:text-2xl">{title}</h2>{' '}
          <p className="mt-1.5 text-base leading-relaxed text-ink-900">{message}</p>
        </div>
      </div>

      {organizations.length > 0 && (
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {organizations.map((org) => {
            const name = pick(org.name, locale);
            const site = org.report_url || org.website;
            return (
              <li
                key={org.id}
                className="flex flex-col rounded-[var(--radius-control)] border border-[var(--color-danger-200)] bg-white transition-colors hover:border-[var(--color-danger-600)]"
              >
                <a
                  href={`tel:${org.phone.replace(/[^\d+]/g, '')}`}
                  aria-label={`${name} ${org.phone} ${t.emergency.callLabel}`}
                  className="flex flex-1 items-center gap-3 px-4 py-3"
                >
                  <Icon name="phone" size={18} className="shrink-0 text-[var(--color-danger-600)]" />{' '}
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-nowrap text-lg font-extrabold text-[var(--color-danger-700)]">
                      {org.phone}
                    </span>{' '}
                    <span className="block text-sm leading-snug text-ink-700">{name}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-[var(--color-danger-700)]">{t.emergency.callLabel}</span>
                </a>
                {site && (
                  // 긴급 상황에서는 새 창을 강제로 열지 않고 같은 창에서 공식 사이트로 이동합니다. (뒤로 가기로 돌아올 수 있게)
                  <a
                    href={site}
                    rel="noopener noreferrer"
                    aria-label={`${name} ${t.emergency.officialSite}`}
                    className="flex items-center gap-1.5 border-t border-[var(--color-danger-200)] px-4 py-2 text-[13px] font-semibold text-ink-700 hover:text-[var(--color-danger-700)]"
                  >
                    <Icon name="external" size={14} className="shrink-0" /> {t.emergency.officialSite}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {organizations.some((org) => org.report_url || org.website) && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{t.emergency.officialSiteHint}</p>
      )}

      {steps?.length > 0 && (
        <ol className="mt-6 space-y-3">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-base leading-relaxed text-ink-900">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-danger-600)] text-xs font-bold text-white">
                {index + 1}
                <span className="sr-only">.</span>
              </span>{' '}
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      {note && <p className="mt-5 text-sm leading-relaxed text-ink-500">{note}</p>}
      <p className="sr-only">{t.emergency.pageSubtitle}</p>
    </section>
  );
}
