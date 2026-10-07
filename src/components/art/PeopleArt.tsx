// 첫 화면에 쓰는 사람 그림입니다. (장식이라 화면낭독기에서는 읽지 않습니다)
//
// 사진 대신 직접 그린 그림을 쓰는 이유
//   - 실제 청소년의 사진을 쓰려면 동의가 필요하고, 누군가를 특정해 보이게 할 수 있습니다.
//   - 그래서 얼굴 생김새를 그리지 않고, 여러 피부색과 옷차림의 사람이 함께 있는 모습만 담았습니다.
//   - 특정 나라·민족을 가리키는 표시(국기, 전통 의상 등)는 넣지 않았습니다.
//
// 색은 브랜드 파랑에 따뜻한 색을 섞어 썼습니다.

export function PeopleArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 300" role="presentation" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id="lr-people-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dbe4f4" />
          <stop offset="100%" stopColor="#fdf6e6" />
        </linearGradient>
      </defs>

      {/* 바탕 */}
      <rect x="0" y="0" width="360" height="300" rx="28" fill="url(#lr-people-sky)" />
      <circle cx="292" cy="62" r="26" fill="#f2d23c" opacity="0.85" />
      <circle cx="58" cy="52" r="14" fill="#b7c9e8" opacity="0.8" />
      <circle cx="86" cy="38" r="8" fill="#b7c9e8" opacity="0.6" />

      {/* 땅 */}
      <path d="M0 236c58-14 104-6 156 2s128 14 204-8v70H0z" fill="#e8f1ff" />
      <path d="M0 252c64-10 112-2 168 6s122 10 192-6v48H0z" fill="#d7e5fb" />

      {/* 사람 넷: 키와 피부색을 서로 다르게 두되, 생김새는 그리지 않습니다. */}
      {/* 1 */}
      <g>
        <rect x="62" y="166" width="46" height="78" rx="22" fill="#1d4690" />
        <circle cx="85" cy="146" r="19" fill="#f0c49a" />
        <path d="M66 146a19 19 0 0 1 38 0c0-14-8-22-19-22s-19 8-19 22z" fill="#2c2a3a" />
      </g>
      {/* 2 */}
      <g>
        <rect x="118" y="152" width="48" height="92" rx="23" fill="#e2683c" />
        <circle cx="142" cy="131" r="20" fill="#8d5524" />
        <path d="M122 131a20 20 0 0 1 40 0c0-15-9-23-20-23s-20 8-20 23z" fill="#1f1b17" />
      </g>
      {/* 3 */}
      <g>
        <rect x="176" y="162" width="46" height="82" rx="22" fill="#2f8f6b" />
        <circle cx="199" cy="142" r="19" fill="#c68642" />
        <path d="M180 143c0-13 8-21 19-21s19 8 19 21c0 6-5 4-19 4s-19 2-19-4z" fill="#2b2118" />
      </g>
      {/* 4 */}
      <g>
        <rect x="232" y="172" width="44" height="72" rx="21" fill="#34609f" />
        <circle cx="254" cy="153" r="18" fill="#ffdbac" />
        <path d="M236 153a18 18 0 0 1 36 0c0-13-8-20-18-20s-18 7-18 20z" fill="#5b3b1f" />
      </g>

      {/* 말풍선: "물어봐도 괜찮아요" 라는 느낌만 (글자는 넣지 않습니다) */}
      <g>
        <rect x="196" y="76" width="92" height="46" rx="16" fill="#ffffff" />
        <path d="M216 122l-4 16 18-16z" fill="#ffffff" />
        <rect x="210" y="92" width="52" height="7" rx="3.5" fill="#b7c9e8" />
        <rect x="210" y="105" width="36" height="7" rx="3.5" fill="#dbe4f4" />
      </g>
    </svg>
  );
}
