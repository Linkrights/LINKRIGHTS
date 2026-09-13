// 도움받을 수 있는 기관 한 곳을 보여주는 카드입니다.
// 여기에 보이는 이름·전화번호·홈페이지는 모두 content/organizations.json 에서만 가져옵니다.
// (AI가 만들어낸 값은 절대 여기에 들어오지 않습니다.)

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

  return (
    <article className={`lr-card flex h-full flex-col gap-3 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex flex-wrap items-start gap-2">
        <h3 className="flex-1 text-[17px] font-bold leading-snug text-ink-900">{pick(org.name, locale)}</h3>
        {org.emergency && (
          <span className="rounded-full bg-[var(--color-danger-50)] px-2.5 py-1 text-xs font-bold text-[var(--color-danger-700)]">
            {t.organizations.emergencyBadge}
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-ink-700">{pick(org.description, locale)}</p>

      <dl className="grid gap-1.5 text-sm text-ink-500">
        {org.hours && pick(org.hours, locale) && (
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold text-ink-700">{t.common.hours}</dt>
            <dd>{pick(org.hours, locale)}</dd>
          </div>
        )}
        {org.languages?.length > 0 && (
          <div className="flex gap-2">
            <dt className="shrink-0 font-semibold text-ink-700">{t.common.languages}</dt>
            <dd>{org.languages.map((code) => languageLabel[code] ?? code).join(' · ')}</dd>
          </div>
        )}
      </dl>

      {/* 전화번호와 버튼 글자는 줄바꿈하지 않습니다. 카드가 좁으면 버튼이 통째로 다음 줄로 내려갑니다.
          "새 창에서 열림" 안내는 화면낭독기용 이름(aria-label)으로만 전달해 글자 추출에 섞이지 않게 합니다. */}
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        {org.phone && (
          <a
            href={`tel:${org.phone.replace(/[^\d+]/g, '')}`}
            className="lr-btn lr-btn-primary flex-1 whitespace-nowrap text-[15px]"
          >
            <Icon name="phone" size={18} /> {org.phone}
          </a>
        )}
        {org.website && (
          <a
            href={org.website}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${pick(org.name, locale)} ${t.common.website} (${t.common.openInNew})`}
            className="lr-btn lr-btn-ghost flex-1 whitespace-nowrap text-[15px]"
          >
            <Icon name="external" size={18} /> {t.common.website}
          </a>
        )}
      </div>

      <p className="text-xs text-ink-300">
        {t.common.reviewedAt} {formatDate(org.reviewed_at, locale)}
      </p>
    </article>
  );
}
