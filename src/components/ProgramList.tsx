'use client';

// 프로그램 카드 목록과 활동 종류(tag) 필터입니다.
// 필터 버튼은 content/programs.json 에 실제로 있는 tag 로만 만들며, 종류가 2개 이상일 때만 보여줍니다.
// 자바스크립트가 없으면 모든 카드가 그대로 보입니다.
// 카드마다 id(예: #mentoring)가 있어 다른 페이지에서 해당 활동으로 바로 이동할 수 있습니다.

import { useState } from 'react';
import { Reveal } from './Reveal';

export interface ProgramCardData {
  id: string;
  /** 언어와 관계없이 같은 종류인지 구분하는 값 (한국어 tag) */
  tagKey: string;
  tag: string;
  title: string;
  body: string;
  image: string;
}

export function ProgramList({
  items,
  allLabel,
  groupLabel,
}: {
  items: ProgramCardData[];
  allLabel: string;
  groupLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const tags = [...new Map(items.map((item) => [item.tagKey, item.tag])).entries()];
  const chips: { key: string | null; label: string }[] = [
    { key: null, label: allLabel },
    ...tags.map(([key, label]) => ({ key, label })),
  ];
  const shown = active ? items.filter((item) => item.tagKey === active) : items;

  return (
    <>
      {tags.length > 1 && (
        <div role="group" aria-label={groupLabel} className="mb-6 flex flex-wrap gap-2">
          {chips.map((chip) => {
            const pressed = active === chip.key;
            return (
              <button
                key={chip.key ?? 'all'}
                type="button"
                aria-pressed={pressed}
                onClick={() => setActive(chip.key)}
                className={`lr-press rounded-full border px-4 py-2 text-[15px] font-semibold transition-colors ${
                  pressed
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-[var(--color-line)] bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {shown.map((item, index) => (
          <Reveal key={item.id} index={index} className="lr-card overflow-hidden">
            <div id={item.id} className="scroll-mt-24">
              {/* 사진이 있을 때만 보여줍니다. (사진이 없으면 빈 색 상자를 넣지 않습니다) */}
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/images/${item.image}`} alt="" loading="lazy" className="h-48 w-full object-cover" />
              )}
              <div className="border-t-4 border-brand-600 p-5 sm:p-6">
                <span className="text-sm font-semibold text-brand-700">{item.tag}</span>{' '}
                <h2 className="mt-1.5 text-lg font-extrabold leading-snug text-ink-900">{item.title}</h2>{' '}
                <p className="lr-body mt-2">{item.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </ul>
    </>
  );
}
