// 우리에게 도움을 주는 곳(협력기관) 목록입니다. (홈 · 함께하기 · 소개 페이지에서 사용)
// 내용은 content/partners.json 에서 바꾸며, 실제로 협력하는 기관만 등록합니다.
// 잘 보이도록 로고와 기관 이름을 크게 보여줍니다. 로고 파일이 없으면 이름만 보여주고,
// 확인한 공식 주소가 있을 때만 링크를 겁니다.

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
    <ul className="flex flex-wrap justify-center gap-4 sm:gap-6">
      {partners.map((partner) => {
        const name = pick(partner.name, locale);
        const hasLogo = Boolean(partner.logo) && fs.existsSync(path.join(process.cwd(), 'public', partner.logo));
        return (
          <li
            key={partner.id}
            className="lr-card flex w-full max-w-xl flex-col items-center gap-5 p-6 text-center sm:flex-row sm:gap-8 sm:p-8 sm:text-left"
          >
            {hasLogo && (
              // 로고 옆에 기관 이름을 글자로 함께 보여주므로 대체 글자는 비워 둡니다.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner.logo}
                alt=""
                width={144}
                height={144}
                loading="lazy"
                className="h-28 w-28 shrink-0 rounded-[var(--radius-card)] object-contain sm:h-36 sm:w-36"
              />
            )}{' '}
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-snug tracking-tight text-ink-900 sm:text-3xl">{name}</p>{' '}
              <p className="mt-1.5 text-sm font-semibold text-brand-700">{pick(partner.relation, locale)}</p>
              {partner.url && (
                <a
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name} (${t.common.openInNew})`}
                  className="lr-link mt-2 inline-flex items-center gap-1 text-sm"
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
