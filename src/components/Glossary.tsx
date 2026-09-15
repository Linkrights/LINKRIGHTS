// "어려운 말 풀이" 상자입니다. 글 안에 나온 전문 용어와 쉬운 설명을 함께 보여줍니다.
// 전문 용어를 지우지 않고 쉬운 설명을 덧붙이는 방식이며, 설명은 content/glossary.json 에 등록된 것만 씁니다.

import type { GlossaryMatch } from '@/lib/glossary';

export function Glossary({ items, title, className = '' }: { items: GlossaryMatch[]; title: string; className?: string }) {
  if (items.length === 0) return null;
  return (
    <aside aria-label={title} className={`rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-5 ${className}`}>
      <p className="text-sm font-bold text-ink-900">{title}</p>
      <dl className="mt-3 space-y-2.5">
        {items.map((item) => (
          <div key={item.id} className="text-[15px] leading-relaxed">
            <dt className="inline font-bold text-brand-700">{item.term}</dt>
            <span aria-hidden="true" className="text-ink-300">
              {' '}
              →{' '}
            </span>
            <dd className="inline text-ink-700">{item.easy}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
