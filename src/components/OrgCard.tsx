// 도움받을 수 있는 기관 한 곳을 보여주는 카드입니다.
// 여기에 보이는 이름·설명·운영시간·주소·전화번호·홈페이지는 모두 content/organizations.json 에서만 가져옵니다.
// (AI가 만들어낸 값은 절대 여기에 들어오지 않습니다. 확인되지 않은 항목은 비워 두면 화면에 나타나지 않습니다)
//
// 순서: 기관 이름 → "이럴 때 도움을 받을 수 있어요"(설명) → 운영시간·쉬는 날·휴게시간 → 지역·주소(지도 보기) → 지원 언어 → 연락처

import { Icon } from './Icon';
import { formatDate, getMessages, localeNames, pick, type Locale } from '@/lib/i18n';
import type { Organization } from '@/lib/types';

const languageLabel: Record<string, string> = {
  ko: localeNames.ko,
  en: localeNames.en,
  zh: localeNames.zh,
  vi: localeNames.vi,
  other: '+',
};

/** 지역 이름 표시 (organizations.json 의 region 은 한국어로 적습니다) */
const regionNames: Record<string, Partial<Record<Locale, string>>> = {
  서울: { en: 'Seoul', zh: '首尔', vi: 'Seoul' },
};

export function OrgCard({
  org,
  locale,
  compact = false,
}: {
  org: Organization;
  locale: Locale;
  compact?: boolean;
}) {
  const t = getMessages(locale);
  const name = pick(org.name, locale);
  const address = org.address ? pick(org.address, locale) : '';
  const region =
    org.region === '전국' ? t.orgInfo.nationwide : org.region ? (regionNames[org.region]?.[locale] ?? org.region) : '';
  // 지도는 등록된 한국어 주소가 있을 때만 네이버 지도 검색으로 연결합니다. (지도 API·비용 없음)
  const mapHref = org.address?.ko ? `https://map.naver.com/p/search/${encodeURIComponent(org.address.ko)}` : '';

  const rows: { key: string; label: string; value: string }[] = [
    { key: 'hours', label: t.common.hours, value: org.hours ? pick(org.hours, locale) : '' },
    { key: 'holidays', label: t.orgInfo.holidays, value: org.holidays ? pick(org.holidays, locale) : '' },
    { key: 'break', label: t.orgInfo.breakTime, value: org.break_time ? pick(org.break_time, locale) : '' },
    { key: 'place', label: address ? t.orgInfo.address : t.orgInfo.region, value: address || region },
    {
      key: 'languages',
      label: t.common.languages,
      value: (org.languages ?? []).map((code) => languageLabel[code] ?? code).join(' · '),
    },
  ].filter((row) => row.value);

  return (
    <article className={`lr-card flex h-full flex-col ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-[17px] font-bold leading-snug text-ink-900">{name}</h3>
        {org.emergency && (
          <span className="shrink-0 rounded-full bg-[var(--color-danger-50)] px-2.5 py-1 text-xs font-bold text-[var(--color-danger-700)]">
            {t.organizations.emergencyBadge}
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-[13px] font-semibold text-brand-700">{t.organizations.helpsWith}</p>{' '}
        <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{pick(org.description, locale)}</p>
      </div>

      {rows.length > 0 && (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          {rows.map((row) => (
            <div key={row.key} className="contents">
              <dt className="font-semibold text-ink-700">{row.label}</dt>
              <dd className="min-w-0 text-ink-500">
                {row.value}
                {row.key === 'place' && mapHref && (
                  <>
                    {' '}
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${name} ${t.orgInfo.map} (${t.common.openInNew})`}
                      className="lr-link inline-flex items-center gap-1 whitespace-nowrap font-semibold"
                    >
                      <Icon name="map-pin" size={14} /> {t.orgInfo.map}
                    </a>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* 연락처: 전화번호와 버튼 글자는 줄바꿈하지 않고, 카드가 좁으면 버튼이 통째로 다음 줄로 내려갑니다.
          "새 창에서 열림" 안내는 화면낭독기용 이름(aria-label)으로만 전달합니다. */}
      <div className="mt-auto pt-4">
        {(org.phone || org.website) && (
          <div className="flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-4">
            {org.phone && (
              <a
                href={`tel:${org.phone.replace(/[^\d+]/g, '')}`}
                aria-label={`${name} ${t.nav.emergencyCall} ${org.phone}`}
                className="lr-btn lr-btn-primary flex-1 whitespace-nowrap"
              >
                <Icon name="phone" size={18} /> {org.phone}
              </a>
            )}
            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} ${t.common.website} (${t.common.openInNew})`}
                className="lr-btn lr-btn-ghost flex-1 whitespace-nowrap"
              >
                <Icon name="external" size={18} /> {t.common.website}
              </a>
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-ink-500">
          {t.common.reviewedAt} {formatDate(org.reviewed_at, locale)}
        </p>
      </div>
    </article>
  );
}
