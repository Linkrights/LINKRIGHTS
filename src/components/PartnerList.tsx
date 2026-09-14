// 협력기관 목록입니다. (함께하기 · 소개 페이지에서 사용)
// 내용은 content/partners.json 에서 바꾸며, 실제로 협력하는 기관만 등록합니다.
// 로고 파일이 없으면 이름만 보여주고, 확인한 공식 주소가 있을 때만 링크를 겁니다.

import fs from 'node:fs';
import path from 'node:path';
import { Icon } from './Icon';
import { getPartners } from '@/lib/content';
import { getMessages, pick, type Locale } from '@/lib/i18n';

export function PartnerList({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const partners = getPartners();
  if (partners.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {partners.map((partner) => {
        const name = pick(partner.name, locale);
        const hasLogo = Boolean(partner.logo) && fs.existsSync(path.join(process.cwd(), 'public', partner.logo));
        return (
          <li key={partner.id} className="lr-card flex items-center gap-4 p-5">
            {hasLogo && (
              // 로고 옆에 기관 이름을 글자로 함께 보여주므로 대체 글자는 비워 둡니다.
              <img
                src={partner.logo}
                alt=""
                width={64}
                height={64}
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-[var(--radius-control)] object-contain"
              />
            )}{' '}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-700">{pick(partner.relation, locale)}</p>{' '}
              <p className="mt-0.5 text-lg font-bold text-ink-900">{name}</p>
              {partner.url && (
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name} (${t.common.openInNew})`}
                  className="lr-link mt-1 inline-flex items-center gap-1 text-sm"
                >
                  {partner.url.replace(/^https?:\/\//, '')} <Icon name="external" size={14} />
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
