'use client';

// 도움받을 곳 목록과 "내 지역 선택하기"입니다.
// - 지역을 고르지 않으면 모든 기관을 보여줍니다. (처음부터 지역을 입력하지 않아도 됩니다)
// - 지역을 고르면 그 지역에서 이용할 수 있는 기관과 전국 기관(112, 1388 등)만 보여줍니다.
// - 고른 지역은 주소(?region=서울)에만 남기고, 브라우저 저장소나 서버에는 저장하지 않습니다.
// - 기관 카드는 서버에서 그려 넘겨받습니다. 자바스크립트가 없으면 모든 기관이 그대로 보입니다.

import { useEffect, useState, type ReactNode } from 'react';
import { Section } from './Section';
import { servesRegion } from '@/lib/regions';

export interface DirectoryItem {
  id: string;
  nationwide: boolean;
  regions: string[];
  /** 서버에서 그린 카드 (li 요소) */
  card: ReactNode;
}

export interface DirectoryGroup {
  key: string;
  title: string;
  items: DirectoryItem[];
}

export function OrgDirectory({
  groups,
  regions,
  labels,
}: {
  groups: DirectoryGroup[];
  regions: { key: string; label: string }[];
  labels: {
    title: string;
    hint: string;
    all: string;
    countAll: string;
    countRegion: string;
    noRegional: string;
    groupsLabel: string;
  };
}) {
  const [region, setRegion] = useState<string | null>(null);

  // 주소에 지역이 있으면(?region=서울) 그 지역을 고른 상태로 시작합니다.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('region');
    if (value && regions.some((item) => item.key === value)) setRegion(value);
  }, [regions]);

  function choose(key: string | null) {
    setRegion(key);
    const url = new URL(window.location.href);
    if (key) url.searchParams.set('region', key);
    else url.searchParams.delete('region');
    window.history.replaceState(null, '', url);
  }

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => servesRegion(item, region)),
    }))
    .filter((group) => group.items.length > 0);
  const allItems = groups.flatMap((group) => group.items);
  const shown = visibleGroups.flatMap((group) => group.items);
  const localCount = region ? shown.filter((item) => item.regions.includes(region)).length : 0;
  const nationwideCount = shown.filter((item) => item.nationwide && !(region && item.regions.includes(region))).length;
  const regionLabel = regions.find((item) => item.key === region)?.label ?? '';

  const chip = (active: boolean) =>
    `lr-press rounded-full border px-3.5 py-1.5 text-[15px] font-semibold transition-colors ${
      active
        ? 'border-navy-900 bg-navy-900 text-white'
        : 'border-[var(--color-line)] bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
    }`;

  return (
    <>
      {/* 내 지역 선택하기 */}
      <div className="border-b border-[var(--color-line)] bg-white">
        <div className="lr-container py-6">
          <h2 className="text-lg font-extrabold text-ink-900">{labels.title}</h2>
          <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-500">{labels.hint}</p>
          <div role="group" aria-label={labels.title} className="mt-4 flex flex-wrap gap-2">
            <button type="button" aria-pressed={region === null} onClick={() => choose(null)} className={chip(region === null)}>
              {labels.all}
            </button>
            {regions.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={region === item.key}
                onClick={() => choose(item.key)}
                className={chip(region === item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="mt-4 text-[15px] font-semibold text-ink-900">
            {region
              ? labels.countRegion
                  .replace('{region}', regionLabel)
                  .replace('{local}', String(localCount))
                  .replace('{nationwide}', String(nationwideCount))
              : labels.countAll.replace('{n}', String(allItems.length))}
          </p>
          {region && localCount === 0 && (
            <p className="mt-2 max-w-3xl rounded-[var(--radius-control)] bg-surface-soft px-4 py-3 text-[15px] leading-relaxed text-ink-700">
              {labels.noRegional.replace('{region}', regionLabel)}
            </p>
          )}

          {/* 분류 바로가기 */}
          <nav aria-label={labels.groupsLabel} className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-4">
            {visibleGroups.map((group) => (
              <a
                key={group.key}
                href={`#${group.key}`}
                className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-[15px] font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {group.title} <span className="text-ink-500">{group.items.length}</span>
              </a>
            ))}
          </nav>
        </div>
      </div>

      {visibleGroups.map((group) => (
        <Section key={group.key} id={group.key} title={group.title}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <DirectoryCard key={item.id}>{item.card}</DirectoryCard>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}

function DirectoryCard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
