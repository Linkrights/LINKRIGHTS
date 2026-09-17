// 체크리스트 한 개 페이지입니다. (예: /ko/checklists/before-part-time-job)
// 화면 구성: 제목·요약·검토일 → 저장 안내 → 체크 상자 → 참고 → 바탕이 된 권리정보 → 도움받을 곳
// 항목의 더 알아볼 곳은 등록된 권리정보·도움 페이지로만 연결합니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { ChecklistBox, type ChecklistBoxItem } from '@/components/ChecklistBox';
import { Icon } from '@/components/Icon';
import { OrgCard } from '@/components/OrgCard';
import { Notice } from '@/components/Section';
import {
  articleHref,
  getArticle,
  getChecklist,
  getChecklists,
  resolveArticle,
  resolveOrganizations,
} from '@/lib/content';
import { LOCALES, formatDate, getMessages, pick, toLocale } from '@/lib/i18n';
import type { RightsArticle } from '@/lib/types';

export const dynamicParams = false;

export function generateStaticParams() {
  const checklists = getChecklists();
  return LOCALES.flatMap((locale) => checklists.map((checklist) => ({ locale, id: checklist.id })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const checklist = getChecklist(id);
  if (!checklist) return {};
  const body = checklist.i18n[locale] ?? checklist.i18n.ko;
  return { title: body.title, description: body.summary };
}

export default async function ChecklistPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const checklist = getChecklist(id);
  if (!checklist) notFound();

  const t = getMessages(locale);
  const body = checklist.i18n[locale] ?? checklist.i18n.ko;
  const fallback = locale !== 'ko' && !checklist.i18n[locale];
  const basedOn = checklist.based_on.map((articleId) => getArticle(articleId)).filter((a): a is RightsArticle => Boolean(a));
  const orgs = resolveOrganizations(checklist.organizations);

  const items: ChecklistBoxItem[] = checklist.items.map((item) => {
    const article = item.article ? getArticle(item.article) : undefined;
    if (article) {
      return {
        id: item.id,
        text: pick(item.text, locale),
        href: articleHref(locale, article),
        linkLabel: `${t.checklist.more}: ${resolveArticle(article, locale).body.title}`,
      };
    }
    if (item.link) {
      return {
        id: item.id,
        text: pick(item.text, locale),
        href: `/${locale}/${item.link}`,
        linkLabel: item.link === 'emergency' ? t.checklist.emergencyLink : t.checklist.orgLink,
      };
    }
    return { id: item.id, text: pick(item.text, locale) };
  });

  const sectionTitle = 'text-xl font-extrabold text-ink-900 sm:text-2xl';

  return (
    <>
      <header className="border-b border-[var(--color-line)] bg-white">
        <div className="lr-container-narrow py-8 sm:py-12">
          <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
            <Link href={`/${locale}/checklists`} className="font-semibold text-brand-700 hover:underline">
              {t.checklist.listTitle}
            </Link>
          </nav>
          <h1 className="lr-h1 mt-4">{body.title}</h1>
          <p className="lr-lead mt-4">{body.summary}</p>
          <p className="mt-4 text-sm text-ink-500">
            {t.common.reviewedAt} {formatDate(checklist.reviewed_at, locale)}
          </p>
          {fallback && (
            <div className="mt-5">
              <Notice title={t.common.notTranslatedTitle} body={t.common.notTranslatedBody} />
            </div>
          )}
        </div>
      </header>

      <article className="lr-container-narrow space-y-12 py-10 sm:py-14">
        <div className="space-y-5">
          <Notice title={t.checklist.noticeTitle} body={t.checklist.notice} />
          <ChecklistBox
            checklistId={checklist.id}
            items={items}
            labels={{ progress: t.checklist.progress, reset: t.checklist.reset }}
          />
          {body.note && <p className="text-[15px] leading-relaxed text-ink-500">{body.note}</p>}
        </div>

        {basedOn.length > 0 && (
          <section>
            <h2 className={sectionTitle}>{t.checklist.basedOnTitle}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {basedOn.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {orgs.length > 0 && (
          <section>
            <h2 className={sectionTitle}>{t.checklist.orgsTitle}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {orgs.map((org) => (
                <li key={org.id}>
                  <OrgCard org={org} locale={locale} />
                </li>
              ))}
            </ul>
            <Link href={`/${locale}/organizations`} className="lr-link mt-4 inline-flex items-center gap-1 text-[15px] font-semibold">
              {t.checklist.orgLink} <Icon name="arrow-right" size={16} />
            </Link>
          </section>
        )}
      </article>
    </>
  );
}
