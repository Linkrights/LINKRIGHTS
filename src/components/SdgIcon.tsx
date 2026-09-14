// SDG 목표 표시입니다.
// public/images/sdg/sdg-4.png, sdg-10.png 처럼 공식 아이콘 파일이 있으면 그 이미지를 그대로(모양·색 변경 없이) 보여주고,
// 파일이 없으면 지금처럼 목표 번호가 적힌 색 상자를 보여줍니다.
// 옆에 "SDG 4 · 양질의 교육" 같은 제목이 함께 있으므로, 이미지는 화면낭독기가 중복해서 읽지 않도록 alt="" 로 둡니다.

import fs from 'node:fs';
import path from 'node:path';

const FALLBACK_COLORS: Record<string, string> = {
  '4': 'var(--color-sdg4)',
  '10': 'var(--color-sdg10)',
};

export function SdgIcon({ code }: { code: string }) {
  const number = code.replace(/\D/g, '');
  const fileName = `sdg-${number}.png`;
  const hasImage = fs.existsSync(path.join(process.cwd(), 'public', 'images', 'sdg', fileName));

  if (hasImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/images/sdg/${fileName}`}
        alt=""
        width={80}
        height={80}
        loading="lazy"
        className="h-16 w-16 shrink-0 sm:h-20 sm:w-20"
      />
    );
  }

  return (
    <span
      className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-control)] text-base font-extrabold text-white"
      style={{ background: FALLBACK_COLORS[number] ?? 'var(--color-brand-600)' }}
    >
      {number}
    </span>
  );
}
