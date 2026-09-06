// 권리정보 한 건을 보여주는 카드입니다.
import Link from 'next/link';
import { Icon } from './Icon';
import { articleHref, getCategory, isStale, resolveArticle } from '@/lib/content';
import { formatDate, getMessages, pick, type Locale } from '@/lib/i18n';
import type { RightsArticle } from '@/lib/types';

export function ArticleCard({ article, locale }: { article: RightsArticle; locale: Locale }) {
  const t = getMessages(locale);
  const { body, fallback } = resolveArticle(article, locale);
  const category = getCategory(article.category);
  const stale = isStale(article.reviewed_at);

  return (
    <Link href={articleHref(locale, article)} className="lr-card lr-card-hover flex h-full flex-col gap-2 p-5">
      {category && <span className="lr-chip w-fit">{pick(category.name, locale)}</span>}
      <h3 className="text-[17px] font-bold leading-snug text-ink-900">{body.title}</h3>
      <p className="line-clamp-3 text-sm leading-relaxed text-ink-500">{body.summary}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-ink-300">
        <span>
          {t.common.reviewedAt} {formatDate(article.reviewed_at, locale)}
        </span>
        {fallback && (
          <span className="inline-flex items-center gap-1 font-semibold text-brand-600">
            <Icon name="globe" size={12} /> 한국어
          </span>
        )}
        {stale && <span className="font-semibold text-warm-500">{t.common.staleTitle}</span>}
      </div>
    </Link>
  );
}
