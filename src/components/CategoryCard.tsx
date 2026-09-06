// 홈과 권리정보 목록에 보이는 분야 카드입니다.
import Link from 'next/link';
import { Icon, type IconName } from './Icon';
import { pick, type Locale } from '@/lib/i18n';
import type { Category } from '@/lib/types';

// 분야마다 다른 색을 씁니다. 색 이름은 content/categories.json 의 "tone" 값과 짝을 이룹니다.
const tones: Record<string, string> = {
  blue: 'bg-brand-50 text-brand-700',
  violet: 'bg-[#f2eefe] text-[#5b3fbf]',
  rose: 'bg-accent-50 text-accent-600',
  teal: 'bg-[#e6f6f4] text-[#0f766e]',
  amber: 'bg-warm-100 text-warm-500',
  green: 'bg-[#e9f7ee] text-[#1f7a44]',
  slate: 'bg-[#eef1f6] text-ink-700',
};

export function CategoryCard({ category, locale }: { category: Category; locale: Locale }) {
  const href =
    category.kind === 'directory' ? `/${locale}/organizations` : `/${locale}/rights/${category.id}`;
  const tone = tones[category.tone] ?? tones.blue;

  return (
    <Link href={href} className="lr-card lr-card-hover group flex h-full flex-col gap-3 p-5">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}>
        <Icon name={category.icon as IconName} size={22} />
      </span>
      <span className="text-[17px] font-bold leading-snug text-ink-900">{pick(category.name, locale)}</span>
      <span className="text-sm leading-relaxed text-ink-500">{pick(category.tagline, locale)}</span>
      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-brand-700">
        <Icon name="arrow-right" size={16} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
