'use client';

// 체크리스트의 체크 상자입니다.
// - 체크 상태는 로그인 없이 이 브라우저(localStorage)에만 저장하고, 서버로 보내지 않습니다.
// - 체크리스트마다 저장 이름이 달라(linkrights:checklist:<id>) 다른 체크리스트와 섞이지 않습니다.
// - 저장소를 쓸 수 없는 브라우저(개인정보 보호 모드 등)에서는 이 화면에서만 기억합니다.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export interface ChecklistBoxItem {
  id: string;
  text: string;
  href?: string;
  linkLabel?: string;
}

type Checked = Record<string, true>;

export function ChecklistBox({
  checklistId,
  items,
  labels,
  done: doneSlot,
}: {
  checklistId: string;
  items: ChecklistBoxItem[];
  labels: { progress: string; reset: string; doneTitle: string; doneBody: string };
  /** 모두 확인했을 때 축하 상자 아래에 함께 보여줄 다음 행동 (도움받을 곳 링크 등) */
  done?: React.ReactNode;
}) {
  const storageKey = `linkrights:checklist:${checklistId}`;
  const [checked, setChecked] = useState<Checked>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}') as Record<string, unknown>;
      const ids = new Set(items.map((item) => item.id));
      const restored: Checked = {};
      for (const [key, value] of Object.entries(saved ?? {})) {
        if (value === true && ids.has(key)) restored[key] = true;
      }
      setChecked(restored);
    } catch {
      // 저장소를 읽을 수 없으면 빈 상태로 시작합니다.
    }
  }, [storageKey, items]);

  function update(next: Checked) {
    setChecked(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // 저장소를 쓸 수 없으면 이 화면에서만 기억합니다.
    }
  }

  function toggle(id: string, value: boolean) {
    const next = { ...checked };
    if (value) next[id] = true;
    else delete next[id];
    update(next);
  }

  const done = items.filter((item) => checked[item.id]).length;
  const allDone = items.length > 0 && done === items.length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-[15px] font-bold text-ink-900">
          {labels.progress.replace('{done}', String(done)).replace('{total}', String(items.length))}
        </p>
        {done > 0 && (
          <button type="button" onClick={() => update({})} className="lr-btn lr-btn-ghost lr-btn-sm">
            {labels.reset}
          </button>
        )}
      </div>
      <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
          style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
        />
      </div>

      <ul className="mt-5 divide-y divide-[var(--color-line)] rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
        {items.map((item) => {
          const inputId = `check-${checklistId}-${item.id}`;
          const isChecked = Boolean(checked[item.id]);
          return (
            <li key={item.id} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) => toggle(item.id, event.target.checked)}
                  className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-[var(--color-brand-600)]"
                />
                <label
                  htmlFor={inputId}
                  className={`min-w-0 flex-1 cursor-pointer text-base font-semibold leading-relaxed ${
                    isChecked ? 'text-ink-500 line-through decoration-ink-300' : 'text-ink-900'
                  }`}
                >
                  {item.text}
                </label>
              </div>
              {item.href && item.linkLabel && (
                <Link href={item.href} className="lr-link mt-1.5 ml-9 inline-block text-sm font-semibold">
                  {item.linkLabel}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {/* 모두 확인했을 때: "끝났다"로 두지 않고 다음에 무엇을 하면 되는지까지 알려줍니다. */}
      {allDone && (
        <div
          role="status"
          className="lr-appear mt-5 rounded-[var(--radius-card)] border border-brand-200 bg-brand-50 p-5"
        >
          <p className="flex items-center gap-2 text-base font-extrabold text-brand-900">
            <Icon name="check" size={20} className="shrink-0 text-brand-600" /> {labels.doneTitle}
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{labels.doneBody}</p>
          {doneSlot && <div className="mt-3">{doneSlot}</div>}
        </div>
      )}
    </div>
  );
}
