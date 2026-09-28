// 커뮤니티(이야기 나누기)의 규칙입니다.
//
// 이 파일에는 데이터베이스나 브라우저 코드가 없습니다. "무엇을 받고, 무엇을 거절하는지"만 정합니다.
// (서버·화면·검사 스크립트가 같은 규칙을 함께 씁니다)
//
// 지키는 것
//  - 이름 칸이 없습니다. 화면에는 이용자가 정한 별명만 보입니다. (처음에는 우리가 지어 줍니다)
//  - 글과 댓글은 길이를 제한하고, 보이지 않는 제어문자는 지웁니다.
//  - 신고가 쌓이면 자동으로 숨기고 운영팀이 봅니다. (운영팀은 언제든 숨기거나 지울 수 있습니다)

export const BOARDS = ['free', 'ask', 'info'] as const;
export type Board = (typeof BOARDS)[number];

export const COMMUNITY_LIMITS = {
  title: 100,
  body: 3000,
  comment: 1000,
  nickname: 20,
  nicknameMin: 2,
  titleMin: 2,
  bodyMin: 5,
  /** 이만큼 신고가 쌓이면 자동으로 숨깁니다. */
  hideAfterReports: 3,
  /** 한 사람이 5분 동안 올릴 수 있는 글·댓글 수 */
  perWindow: 5,
};

/** 별명을 지어 줍니다. 이름이 드러나지 않도록 낱말 + 숫자로만 만듭니다. */
const NICKNAME_WORDS = ['파란', '초록', '노란', '하얀', '빨간', '보라', '까만', '분홍'];
const NICKNAME_ANIMALS = ['고양이', '강아지', '토끼', '여우', '펭귄', '다람쥐', '부엉이', '돌고래'];

export function makeNickname(seed: number): string {
  const word = NICKNAME_WORDS[seed % NICKNAME_WORDS.length];
  const animal = NICKNAME_ANIMALS[Math.floor(seed / NICKNAME_WORDS.length) % NICKNAME_ANIMALS.length];
  return `${word}${animal}${(seed % 900) + 100}`;
}

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
    .slice(0, max);
}

export interface PostInput {
  board: Board;
  title: string;
  body: string;
  locale: string;
}

export type CommunityResult<T> = { ok: true; value: T } | { ok: false; reason: string };

export function validatePost(payload: unknown, locales: readonly string[]): CommunityResult<PostInput> {
  if (typeof payload !== 'object' || payload === null) return { ok: false, reason: 'payload' };
  const raw = payload as Record<string, unknown>;
  const board = BOARDS.find((value) => value === raw.board);
  if (!board) return { ok: false, reason: 'board' };
  const title = text(raw.title, COMMUNITY_LIMITS.title);
  if (title.length < COMMUNITY_LIMITS.titleMin) return { ok: false, reason: 'title' };
  const body = text(raw.body, COMMUNITY_LIMITS.body);
  if (body.length < COMMUNITY_LIMITS.bodyMin) return { ok: false, reason: 'body' };
  const locale = typeof raw.locale === 'string' && locales.includes(raw.locale) ? raw.locale : locales[0];
  return { ok: true, value: { board, title, body, locale } };
}

export function validateComment(payload: unknown): CommunityResult<string> {
  if (typeof payload !== 'object' || payload === null) return { ok: false, reason: 'payload' };
  const body = text((payload as Record<string, unknown>).body, COMMUNITY_LIMITS.comment);
  if (body.length < COMMUNITY_LIMITS.bodyMin) return { ok: false, reason: 'body' };
  return { ok: true, value: body };
}

/** 별명: 2~20자, 앞뒤 빈칸 없음, 전화번호·이메일처럼 보이는 글자는 받지 않습니다. */
export function validateNickname(value: unknown): CommunityResult<string> {
  const nickname = text(value, COMMUNITY_LIMITS.nickname).replace(/\s+/g, ' ');
  if (nickname.length < COMMUNITY_LIMITS.nicknameMin) return { ok: false, reason: 'short' };
  if (/@|\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}|\d{6,}/.test(nickname)) return { ok: false, reason: 'personal' };
  return { ok: true, value: nickname };
}
