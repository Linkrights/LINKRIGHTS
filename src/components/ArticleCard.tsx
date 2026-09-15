// 권리정보 한 건을 보여주는 카드입니다.
// 카드 어디를 눌러도 상세 페이지로 가고, 오른쪽 위 별(☆) 버튼으로 이 브라우저에 저장할 수 있습니다.
// (링크 안에 버튼을 넣을 수 없어, 제목 링크의 누르는 영역을 카드 전체로 넓히고 별 버튼만 그 위에 올립니다)
import Link from 'next/link';
import { Icon } from './Icon';
import { SaveButton } from './SaveButton';
import { articleHref, getCategory, isStale, resolveArticle } from '@/lib/content';
import { formatDate, getMessages, pick, type Locale } from '@/lib/i18n';
import type { RightsArticle } from '@/lib/types';

export function ArticleCard({ article, locale }: { article: RightsArticle; locale: Locale }) {
  const t = getMessages(locale);
  const { body, fallback } = resolveArticle(article, locale);
  const category = getCategory(article.category);
  const stale = isStale(article.reviewed_at);

  return (
    <div className="lr-card lr-card-hover group relative flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {category && <span className="text-sm font-semibold text-brand-700">{pick(category.name, locale)}</span>}{' '}
          <h3 className="mt-1.5 text-[17px] font-bold leading-snug text-ink-900 group-hover:text-brand-800">
            <Link
              href={articleHref(locale, article)}
              className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']"
            >
              {body.title}
            </Link>
          </h3>
        </div>
        <div className="relative z-10 -mr-1 -mt-1">
          <SaveButton
            compact
            id={article.id}
            label={t.saved.saveLabel.replace('{title}', body.title)}
            saveText={t.saved.save}
            savedText={t.saved.savedText}
          />
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-ink-500">{body.summary}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-[13px] text-ink-500">
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
    </div>
  );
}
