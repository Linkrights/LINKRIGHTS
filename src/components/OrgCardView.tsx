// 도움받을 수 있는 기관 한 곳을 보여주는 카드의 모양입니다. (화면 문구는 t 로 받습니다)
// 서버에서 그리는 곳은 OrgCard 를, 브라우저에서 많은 카드를 그리는 도움받을 곳 목록(OrgDirectory)은 이 부품을 바로 씁니다.
// 이 파일은 4개 언어 문구 파일을 불러오지 않습니다. (필요한 문구만 받아서 화면에 넘기는 양을 줄입니다)
// 여기에 보이는 이름·설명·운영시간·주소·전화번호·홈페이지는 모두 content/organizations*.json 에서만 가져옵니다.
// (AI가 만들어낸 값은 절대 여기에 들어오지 않습니다. 확인되지 않은 항목은 비워 두면 화면에 나타나지 않습니다)
//
// 순서: 기관 이름 → 지역·분야 태그 → "이럴 때 도움을 받을 수 있어요"(설명) → 지원 언어 → 운영시간·쉬는 날·휴게시간
//       → 주소(지도 보기) → 연락처
//
// 지역 태그: 전국 기관은 [전국], 특정 지역 기관은 [서울]처럼 등록된 지역을 그대로 보여줍니다.
//   시·군·구가 등록된 지역 기관은 [대구 중구]·[포항시]처럼 더 좁은 지역을 보여줍니다.
//   지역마다 센터가 있는 기관(local_network)은 [지역별 센터] 태그를 함께 붙입니다.
// 분야 태그: 등록된 topics 중 앞의 2개만 보여줍니다.

import { Icon } from './Icon';
import type { Locale, Messages } from '@/lib/i18n';
import { formatDate, pick } from '@/lib/localize';
import { organizationArea, regionName } from '@/lib/regions';
import { isOrgTopic } from '@/lib/topics';
import type { Organization } from '@/lib/types';

/** 카드에 보여줄 분야 태그 수 */
const MAX_TOPIC_TAGS = 2;

/** 카드에 필요한 화면 문구 묶음 */
export type OrgCardMessages = Pick<
  Messages,
  'common' | 'orgInfo' | 'orgTopics' | 'organizations' | 'nav' | 'languageNames' | 'callScript'
>;

export function OrgCardView({
  org,
  locale,
  t,
  compact = false,
}: {
  org: Organization;
  locale: Locale;
  t: OrgCardMessages;
  compact?: boolean;
}) {
  const name = pick(org.name, locale);
  const address = org.address ? pick(org.address, locale) : '';
  const area = organizationArea(org);
  const region = area.nationwide
    ? t.orgInfo.nationwide
    : org.area
      ? pick(org.area, locale)
      : area.regions.map((key) => regionName(key, locale)).join(' · ');
  const phoneNote = org.phone_note ? pick(org.phone_note, locale) : '';
  const topics = (org.topics ?? []).filter(isOrgTopic).slice(0, MAX_TOPIC_TAGS);

  // "전화하기 전에 이렇게 말해보세요": 전화번호가 있는 일반 기관에만 (긴급 번호는 바로 전화하도록 넣지 않습니다)
  // 모두 "물어보는" 문장이며, 기관이 어떤 서비스를 한다고 단정하지 않습니다.
  //  - 한국어가 아닌 지원 언어가 등록된 기관: 그 언어로 상담할 수 있는지 묻는 문장
  //  - 그렇지 않으면: 한국어가 어려워도 상담할 수 있는지 묻는 문장
  //  - 청소년 기관이 아니면: 청소년도 상담받을 수 있는지 묻는 문장
  const otherLanguages = (org.languages ?? [])
    .filter((code) => code !== 'ko' && code !== 'other')
    .map((code) => (t.languageNames as Record<string, string>)[code] ?? code);
  const callLines =
    org.phone && !org.emergency
      ? [
          t.callScript.cardLine1,
          otherLanguages.length > 0
            ? t.callScript.cardLanguage.replace('{languages}', otherLanguages.join(', '))
            : t.callScript.cardKorean,
          ...(org.category !== 'youth' ? [t.callScript.cardYouth] : []),
          t.callScript.line3,
        ]
      : [];
  // 지도는 등록된 한국어 주소가 있을 때만 네이버 지도 검색으로 연결합니다. (지도 API·비용 없음)
  const mapHref = org.address?.ko ? `https://map.naver.com/p/search/${encodeURIComponent(org.address.ko)}` : '';
  // 홈페이지 버튼이 어디로 가는지 알 수 있게 주소(도메인)만 함께 적습니다.
  const siteHost = (() => {
    const url = org.website || org.source_url;
    if (!url) return '';
    try {
      return new URL(url).host.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();

  // 카드에는 전화를 걸기 전에 꼭 필요한 것(지원 언어·운영시간)만 두고,
  // 휴무일·점심시간·주소처럼 덜 급한 것은 "자세한 정보"를 눌렀을 때 보여줍니다. (카드가 길어지지 않게)
  const rows: { key: string; label: string; value: string }[] = [
    {
      key: 'languages',
      label: t.common.languages,
      // 지원 언어 이름은 화면 언어로 보여줍니다. (영어 화면이면 Korean · English)
      value: (org.languages ?? []).map((code) => (t.languageNames as Record<string, string>)[code] ?? code).join(' · '),
    },
    { key: 'hours', label: t.common.hours, value: org.hours ? pick(org.hours, locale) : '' },
  ].filter((row) => row.value);
  const moreRows: { key: string; label: string; value: string }[] = [
    { key: 'holidays', label: t.orgInfo.holidays, value: org.holidays ? pick(org.holidays, locale) : '' },
    { key: 'break', label: t.orgInfo.breakTime, value: org.break_time ? pick(org.break_time, locale) : '' },
    // 지역은 위의 태그로 보여주므로 여기에는 등록된 주소만 둡니다.
    { key: 'place', label: t.orgInfo.address, value: address },
  ].filter((row) => row.value);

  const tag = 'rounded-full px-2.5 py-0.5 text-xs font-bold';

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

      {/* 지역·분야 태그 */}
      <p className="mt-2 flex flex-wrap gap-1.5">
        {region && (
          <span className={`${tag} bg-brand-50 text-brand-700`}>
            <span className="sr-only">{t.orgInfo.region}: </span>
            {region}
          </span>
        )}
        {org.local_network && <span className={`${tag} bg-brand-50 text-brand-700`}>{t.orgInfo.localNetwork}</span>}
        {topics.map((topic) => (
          <span key={topic} className={`${tag} border border-[var(--color-line)] font-semibold text-ink-700`}>
            {t.orgTopics[topic]}
          </span>
        ))}
      </p>

      <div className="mt-3">
        <p className="text-[13px] font-semibold text-brand-700">{t.organizations.helpsWith}</p>{' '}
        <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{pick(org.description, locale)}</p>
      </div>

      {rows.length > 0 && (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          {rows.map((row) => (
            <div key={row.key} className="contents">
              <dt className="font-semibold text-ink-700">{row.label}</dt>
              <dd className="min-w-0 text-ink-500">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* 휴무일·점심시간·주소: 필요할 때만 펼쳐 봅니다. */}
      {moreRows.length > 0 && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-ink-500 hover:text-brand-700 [&::-webkit-details-marker]:hidden">
            {t.orgInfo.moreInfo}
            <span className="text-ink-300 transition-transform group-open:rotate-180" aria-hidden="true">
              ▾
            </span>
          </summary>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            {moreRows.map((row) => (
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
        </details>
      )}

      {/* 연락처: 전화번호와 버튼 글자는 줄바꿈하지 않고, 카드가 좁으면 버튼이 통째로 다음 줄로 내려갑니다.
          "새 창에서 열림" 안내는 화면낭독기용 이름(aria-label)으로만 전달합니다.
          누리집에서 가까운 이용기관을 찾는 기관(finder)은 버튼 이름이 "가까운 곳 찾기"입니다.
          전화번호도 누리집도 없으면 등록된 출처(공식 안내)로 연결합니다. */}
      <div className="mt-auto pt-4">
        {!org.phone && !org.website && org.source_url && (
          <div className="flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-4">
            <a
              href={org.source_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name} ${t.orgInfo.officialInfo} (${t.common.openInNew})`}
              className="lr-btn lr-btn-ghost flex-1 whitespace-nowrap"
            >
              <Icon name="external" size={18} /> {t.orgInfo.officialInfo}
            </a>
          </div>
        )}
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
                aria-label={`${name} ${org.finder ? t.orgInfo.findNearby : t.common.website} (${t.common.openInNew})`}
                className="lr-btn lr-btn-ghost flex-1 whitespace-nowrap"
              >
                <Icon name="external" size={18} /> {org.finder ? t.orgInfo.findNearby : t.common.website}
              </a>
            )}
          </div>
        )}
        {/* 어디로 이어지는 링크인지 주소를 함께 보여줍니다. (등록된 주소에서 그대로 가져옵니다) */}
        {siteHost && <p className="mt-2 text-[13px] text-ink-500">{siteHost}</p>}
        {phoneNote && <p className="mt-2 text-sm leading-relaxed text-ink-700">{phoneNote}</p>}
        {callLines.length > 0 && (
          <details className="group mt-3 rounded-[var(--radius-control)] border border-[var(--color-line)]">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-semibold text-ink-700 hover:bg-surface-soft [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-start gap-2">
                <Icon name="message" size={16} className="mt-0.5 shrink-0 text-brand-600" />
                <span>{t.callScript.title}</span>
              </span>
              <span className="mt-0.5 shrink-0 text-ink-300 transition-transform group-open:rotate-180" aria-hidden="true">
                ▾
              </span>
            </summary>
            <div className="border-t border-[var(--color-line)] px-3.5 pb-3.5 pt-3">
              <ul className="space-y-2">
                {callLines.map((line) => (
                  <li key={line} className="rounded-[var(--radius-control)] bg-surface-soft px-3 py-2 text-sm leading-relaxed text-ink-900">
                    “{line}”
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">{t.callScript.cardNote}</p>
            </div>
          </details>
        )}
        <p className="mt-3 text-xs text-ink-500">
          {t.common.reviewedAt} {formatDate(org.reviewed_at, locale)}
        </p>
      </div>
    </article>
  );
}
