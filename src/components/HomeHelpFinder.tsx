// 홈의 "혼자 해결하기 어렵다면 — 도움받을 곳 찾기" 상자입니다.
// 지역을 고르고 버튼을 누르면 도움받을 곳 페이지(/organizations?region=…)로 이동합니다. (자바스크립트 없이도 동작하는 일반 폼)
// 긴급 상황은 일반 상담과 섞지 않고 붉은 상자로 따로 두며, 등록된 긴급 번호(112·119)로 바로 전화하게 합니다.
// 기관 수는 등록된 기관 자료에서 센 숫자만 보여줍니다.

import Link from 'next/link';
import { Icon } from './Icon';
import { NATIONWIDE } from '@/lib/regions';

export function HomeHelpFinder({
  locale,
  regions,
  counts,
  contacts,
  labels,
}: {
  locale: string;
  regions: { key: string; label: string }[];
  counts: { nationwide: number; local: number };
  /** 등록된 긴급 기관 (112·119) */
  contacts: { id: string; name: string; phone: string }[];
  labels: {
    title: string;
    body: string;
    regionLabel: string;
    allRegions: string;
    nationwideOnly: string;
    submit: string;
    count: string;
    emergencyTitle: string;
    emergencyBody: string;
    emergencyMore: string;
    call: string;
  };
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* 일반 상담·도움: 지역을 골라 찾기 */}
      <div className="lr-card p-5 sm:p-6">
        <h3 className="flex items-center gap-2.5 text-lg font-extrabold text-ink-900">
          <span className="lr-icon-badge h-10 w-10">
            <Icon name="lifebuoy" size={20} />
          </span>
          {labels.title}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{labels.body}</p>
        <form action={`/${locale}/organizations`} method="get" className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="home-help-region" className="mb-1 block text-sm font-semibold text-ink-700">
              {labels.regionLabel}
            </label>
            <span className="relative flex items-center">
              <select
                id="home-help-region"
                name="region"
                defaultValue=""
                className="h-12 w-full cursor-pointer appearance-none rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] py-0 pl-3.5 pr-9 text-[15px] font-semibold text-ink-900 transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-[3px] focus:ring-brand-100"
              >
                <option value="">{labels.allRegions}</option>
                <option value={NATIONWIDE}>{labels.nationwideOnly}</option>
                {regions.map((region) => (
                  <option key={region.key} value={region.key}>
                    {region.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3.5 text-xs text-ink-500" aria-hidden="true">
                ▾
              </span>
            </span>
          </div>
          <button type="submit" className="lr-btn lr-btn-primary lr-press h-12 shrink-0">
            <Icon name="map-pin" size={18} /> {labels.submit}
          </button>
        </form>
        <p className="mt-3 text-sm text-ink-500">
          {labels.count.replace('{nationwide}', String(counts.nationwide)).replace('{local}', String(counts.local))}
        </p>
      </div>

      {/* 긴급: 일반 상담과 구분해 바로 전화 */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-danger-200)] bg-[var(--color-danger-50)] p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-extrabold text-[var(--color-danger-700)]">
          <Icon name="alert" size={20} className="shrink-0" /> {labels.emergencyTitle}
        </h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-900">{labels.emergencyBody}</p>
        {contacts.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <a
                  href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                  aria-label={`${contact.name} ${contact.phone} ${labels.call}`}
                  className="flex h-full flex-col items-start rounded-[var(--radius-control)] border border-[var(--color-danger-200)] bg-white px-3.5 py-2.5 transition-colors hover:border-[var(--color-danger-600)]"
                >
                  <span className="flex items-center gap-1.5 text-xl font-extrabold text-[var(--color-danger-700)]">
                    <Icon name="phone" size={16} className="shrink-0" /> {contact.phone}
                  </span>
                  <span className="mt-0.5 text-sm leading-snug text-ink-700">{contact.name}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={`/${locale}/emergency`}
          className="mt-4 inline-flex items-center gap-1 text-[15px] font-bold text-[var(--color-danger-700)] underline underline-offset-2"
        >
          {labels.emergencyMore} <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    </div>
  );
}
