// LINKRIGHTS 공식 로고입니다.
// 원본 로고 이미지(public/images/linkrights-logo.png)를 모양·색·비율 그대로 두고 크기만 줄여서 씁니다.

export function Logo({
  className = 'h-11 w-11',
  withName = true,
}: {
  /** 로고 크기 (예: "h-11 w-11 sm:h-12 sm:w-12") */
  className?: string;
  /** 로고 옆에 LINKRIGHTS 글자를 함께 보여줄지 */
  withName?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/linkrights-logo.png"
        alt={withName ? '' : 'LINKRIGHTS'}
        width={96}
        height={96}
        className={`shrink-0 object-contain ${className}`}
      />
      {withName && <span className="text-[19px] font-extrabold tracking-tight text-ink-900">LINKRIGHTS</span>}
    </span>
  );
}
