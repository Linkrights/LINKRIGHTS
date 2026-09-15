'use client';

// 권리정보 즐겨찾기(저장) 버튼입니다. 로그인 없이 "지금 쓰는 브라우저"에만 저장됩니다.
// - 저장하는 것은 권리정보 id(예: labor-unpaid-wages)뿐이며, 이름·연락처 같은 개인정보는 저장하지 않습니다.
// - 서버로 보내지 않습니다. 브라우저 기록(사이트 데이터)을 지우면 함께 사라집니다.
// - 같은 화면의 다른 저장 버튼·저장 목록과 바로 맞춰지도록 이벤트로 알립니다.

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

const STORAGE_KEY = 'linkrights:saved-rights';
const CHANGE_EVENT = 'linkrights:saved-change';

function readSaved(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, 200) : [];
  } catch {
    return [];
  }
}

function writeSaved(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // 저장소를 쓸 수 없는 브라우저(개인정보 보호 모드 등)에서는 이 화면에서만 기억합니다.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 저장한 권리정보 id 목록. 브라우저에서 읽기 전에는 null 입니다. */
export function useSavedIds(): [string[] | null, (ids: string[]) => void] {
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    const sync = () => setIds(readSaved());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return [
    ids,
    (next) => {
      setIds(next);
      writeSaved(next);
    },
  ];
}

export function SaveButton({
  id,
  label,
  savedText,
  saveText,
  compact = false,
}: {
  id: string;
  /** 화면낭독기용 이름 (예: "임금체불 저장하기") */
  label: string;
  saveText: string;
  savedText: string;
  /** 카드 위의 작은 별 버튼 */
  compact?: boolean;
}) {
  const [ids, update] = useSavedIds();
  const saved = Boolean(ids?.includes(id));
  const toggle = () => {
    const current = ids ?? [];
    update(saved ? current.filter((item) => item !== id) : [...current, id]);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={label}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${
          saved
            ? 'border-brand-600 bg-brand-50 text-brand-700'
            : 'border-[var(--color-line)] bg-white text-ink-500 hover:border-brand-300 hover:text-brand-700'
        }`}
      >
        <Icon name="star" size={18} fill={saved ? 'currentColor' : 'none'} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className={`lr-btn lr-btn-sm lr-press ${saved ? 'border-brand-600 bg-brand-50 text-brand-700' : 'lr-btn-ghost'}`}
    >
      <Icon name="star" size={18} fill={saved ? 'currentColor' : 'none'} />
      {saved ? savedText : saveText}
    </button>
  );
}
