'use client';

// 이 브라우저에 저장한 권리정보 목록입니다. 제목·요약은 서버가 넘겨준 등록 권리정보에서만 가져옵니다.
// (저장 당시 이후 삭제·비공개된 글은 목록에 나타나지 않습니다)

import Link from 'next/link';
import { Icon } from './Icon';
import { useSavedIds } from './SaveButton';

export interface SavedArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  href: string;
}

export function SavedList({
  articles,
  rightsHref,
  labels,
}: {
  articles: SavedArticle[];
  rightsHref: string;
  labels: { empty: string; emptyCta: string; remove: string; clearAll: string; count: string };
}) {
  const [ids, update] = useSavedIds();
  if (ids === null) return null;

  const saved = ids.map((id) => articles.find((article) => article.id === id)).filter((a): a is SavedArticle => Boolean(a));

  if (saved.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] bg-white px-6 py-10 text-center">
        <p className="text-base leading-relaxed text-ink-700">{labels.empty}</p>
        <Link href={rightsHref} className="lr-btn lr-btn-primary lr-press mt-5">
          {labels.emptyCta} <Icon name="arrow-right" size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-[15px] font-semibold text-ink-700">
          {labels.count.replace('{count}', String(saved.length))}
        </p>
        <button type="button" onClick={() => update([])} className="lr-btn lr-btn-ghost lr-btn-sm">
          {labels.clearAll}
        </button>
      </div>
      <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
        {saved.map((article) => (
          <li key={article.id} className="flex items-start gap-3 p-5">
            <div className="min-w-0 flex-1">
              {article.category && <p className="text-sm font-semibold text-brand-700">{article.category}</p>}{' '}
              <Link href={article.href} className="mt-1 block text-[17px] font-bold leading-snug text-ink-900 hover:text-brand-700 hover:underline">
                {article.title}
              </Link>{' '}
              <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-ink-500">{article.summary}</p>
            </div>
            <button
              type="button"
              onClick={() => update(ids.filter((id) => id !== article.id))}
              aria-label={`${article.title} ${labels.remove}`}
              className="lr-btn lr-btn-ghost lr-btn-sm shrink-0"
            >
              {labels.remove}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
