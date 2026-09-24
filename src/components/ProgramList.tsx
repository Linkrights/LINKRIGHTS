'use client';

// 프로그램 목록과 활동 종류(tag) 필터입니다.
// 필터 버튼은 content/programs.json 에 실제로 있는 tag 로만 만들며, 종류가 2개 이상일 때만 보여줍니다.
// 카드 상자 대신 사진(있을 때만)과 굵은 선으로 구분해, 활동과 사람이 먼저 보이도록 합니다.
// 자바스크립트가 없으면 모든 활동이 그대로 보입니다.
// 활동마다 id(예: #mentoring)가 있어 다른 페이지에서 해당 활동으로 바로 이동할 수 있습니다.

import { useState } from 'react';
import { Reveal } from './Reveal';

export interface ProgramCardData {
  id: string;
  /** 언어와 관계없이 같은 종류인지 구분하는 값 (한국어 tag) */
  tagKey: string;
  tag: string;
  title: string;
  /** 무엇을 하나요 */
  body: string;
  /** 왜 필요한가요 / 어떤 도움을 줄 수 있나요 (등록된 것만, 없으면 빈 글자) */
  why?: string;
  helps?: string;
  /** 운영 정보: 기관 관계자처럼 더 자세히 보고 싶은 분을 위해 접었다 펼 수 있게 보여줍니다. */
  how?: string;
  audience?: string;
  format?: string;
  image: string;
}

export interface ProgramLabels {
  why: string;
  helps: string;
  details: string;
  how: string;
  audience: string;
  format: string;
}

export function ProgramList({
  items,
  allLabel,
  groupLabel,
  labels,
}: {
  items: ProgramCardData[];
  allLabel: string;
  groupLabel: string;
  labels: ProgramLabels;
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
        <div role="group" aria-label={groupLabel} className="mb-10 flex flex-wrap gap-2">
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
                    ? 'border-navy-900 bg-navy-900 text-white'
                    : 'border-[var(--color-line)] bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
        {shown.map((item, index) => (
          <Reveal key={item.id} index={index}>
            <article id={item.id} className="scroll-mt-24">
              {/* 사진이 있을 때만 보여줍니다. (사진이 없으면 빈 색 상자를 넣지 않습니다) */}
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/images/${item.image}`}
                  alt=""
                  loading="lazy"
                  className="mb-5 aspect-[4/3] w-full rounded-[var(--radius-card)] object-cover"
                />
              )}
              <div className="border-t-2 border-navy-900 pt-5">
                <span className="text-sm font-semibold text-brand-700">{item.tag}</span>{' '}
                <h2 className="mt-1.5 text-xl font-extrabold leading-snug text-ink-900">{item.title}</h2>{' '}
                <p className="lr-body mt-2">{item.body}</p>

                {/* 왜 필요한가요 / 어떤 도움을 줄 수 있나요: 등록된 글이 있을 때만 */}
                {(item.why || item.helps) && (
                  <dl className="mt-4 space-y-3 border-t border-[var(--color-line)] pt-4">
                    {item.why && (
                      <div>
                        <dt className="text-[13px] font-bold tracking-[0.02em] text-brand-700">{labels.why}</dt>
                        <dd className="mt-1 text-[15px] leading-relaxed text-ink-700">{item.why}</dd>
                      </div>
                    )}
                    {item.helps && (
                      <div>
                        <dt className="text-[13px] font-bold tracking-[0.02em] text-brand-700">{labels.helps}</dt>
                        <dd className="mt-1 text-[15px] leading-relaxed text-ink-700">{item.helps}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {/* 운영 정보: 기관 관계자처럼 더 자세한 내용이 필요할 때만 펼쳐 봅니다. (등록된 값이 있을 때만) */}
                {(item.how || item.audience || item.format) && (
                  <details className="group mt-4 rounded-[var(--radius-control)] border border-[var(--color-line)]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-surface-soft [&::-webkit-details-marker]:hidden">
                      {labels.details}
                      <span className="shrink-0 text-ink-300 transition-transform group-open:rotate-180" aria-hidden="true">
                        ▾
                      </span>
                    </summary>
                    <dl className="space-y-3 border-t border-[var(--color-line)] px-4 pb-4 pt-3 text-[15px]">
                      {item.how && (
                        <div>
                          <dt className="font-semibold text-ink-900">{labels.how}</dt>
                          <dd className="mt-0.5 leading-relaxed text-ink-700">{item.how}</dd>
                        </div>
                      )}
                      {item.audience && (
                        <div>
                          <dt className="font-semibold text-ink-900">{labels.audience}</dt>
                          <dd className="mt-0.5 leading-relaxed text-ink-700">{item.audience}</dd>
                        </div>
                      )}
                      {item.format && (
                        <div>
                          <dt className="font-semibold text-ink-900">{labels.format}</dt>
                          <dd className="mt-0.5 leading-relaxed text-ink-700">{item.format}</dd>
                        </div>
                      )}
                    </dl>
                  </details>
                )}
              </div>
            </article>
          </Reveal>
        ))}
      </ul>
    </>
  );
}
