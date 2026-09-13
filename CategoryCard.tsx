// 홈과 권리정보 목록에 보이는 분야 카드입니다.
// 색을 여러 개 쓰지 않고, 같은 파랑의 선 아이콘으로 분야를 구분합니다.
import Link from 'next/link';
import { Icon, type IconName } from './Icon';
import { pick, type Locale } from '@/lib/i18n';
import type { Category } from '@/lib/types';

export function CategoryCard({ category, locale }: { category: Category; locale: Locale }) {
  const href =
    category.kind === 'directory' ? `/${locale}/organizations` : `/${locale}/rights/${category.id}`;

  return (
    <Link href={href} className="lr-card lr-card-hover group flex h-full items-start gap-4 p-5">
      <span className="lr-icon-badge">
        <Icon name={category.icon as IconName} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-bold leading-snug text-ink-900 group-hover:text-brand-800">
          {pick(category.name, locale)}
        </span>{' '}
        <span className="mt-1 block text-[15px] leading-relaxed text-ink-500">{pick(category.tagline, locale)}</span>
      </span>
      <Icon
        name="arrow-right"
        size={18}
        className="mt-1 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
      />
    </Link>
  );
}
