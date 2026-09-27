// 이용자가 사이트에서 보낸 글(질문·참여 문의·정보 수정 제보)의 규칙입니다.
//
// 이 파일에는 데이터베이스나 브라우저 코드가 들어 있지 않습니다. "무엇을 받고, 무엇을 거절하는지"만 정합니다.
// (그래야 서버·화면·검사 스크립트가 같은 규칙을 함께 쓸 수 있습니다)
//
// 지키는 것
//  - 받는 칸은 아래 다섯 가지뿐입니다: 종류, 자세한 구분, 화면 언어, 제목, 내용, 답장 받을 곳.
//  - "답장 받을 곳"은 질문에서는 비워 둘 수 있습니다. (비우면 답변은 질문 게시판에 공개로만 올라갑니다)
//  - 여권번호·외국인등록번호처럼 민감한 번호는 화면에서 먼저 안내하고(privacy-detect), 서버에서도 길이를 제한합니다.
//  - 글은 운영팀이 검토해 올리기 전까지 게시판에 보이지 않습니다.

/** 이용자가 보낼 수 있는 글의 종류 */
export const SUBMISSION_KINDS = ['question', 'join', 'correction'] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];

/** 참여 문의의 세부 구분 (함께하기 화면의 세 가지) */
export const JOIN_DETAILS = ['mentee', 'mentor', 'partner'] as const;

/** 운영팀이 글에 붙이는 상태 */
export const SUBMISSION_STATUSES = ['new', 'answered', 'hidden', 'spam'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const LIMITS = {
  title: 120,
  body: 4000,
  contact: 200,
  detail: 80,
  answer: 8000,
  /** 너무 짧은 글은 실수로 누른 것으로 봅니다. */
  bodyMin: 5,
};

export interface SubmissionInput {
  kind: SubmissionKind;
  detail: string;
  locale: string;
  title: string;
  body: string;
  contact: string;
}

export type ValidationResult = { ok: true; value: SubmissionInput } | { ok: false; reason: string };

function text(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // 줄바꿈은 살리고 그 밖의 제어문자는 지웁니다.
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
    .slice(0, max);
}

/**
 * 보낸 값을 확인하고 저장할 모양으로 다듬습니다.
 * 규칙에 맞지 않으면 무엇이 잘못됐는지(reason)만 알려줍니다. (이용자에게는 화면 문구로 바꿔 보여줍니다)
 */
export function validateSubmission(payload: unknown, locales: readonly string[]): ValidationResult {
  if (typeof payload !== 'object' || payload === null) return { ok: false, reason: 'payload' };
  const raw = payload as Record<string, unknown>;

  // 사람이 보이지 않는 칸(honeypot)을 채웠다면 자동 프로그램입니다.
  if (text(raw.website, 200)) return { ok: false, reason: 'bot' };

  const kind = SUBMISSION_KINDS.find((value) => value === raw.kind);
  if (!kind) return { ok: false, reason: 'kind' };

  const body = text(raw.body, LIMITS.body);
  if (body.length < LIMITS.bodyMin) return { ok: false, reason: 'body' };

  const contact = text(raw.contact, LIMITS.contact);
  // 참여 문의는 답장을 드려야 하므로 연락처가 필요합니다.
  if (kind === 'join' && !contact) return { ok: false, reason: 'contact' };

  const locale = typeof raw.locale === 'string' && locales.includes(raw.locale) ? raw.locale : locales[0];
  let detail = text(raw.detail, LIMITS.detail);
  if (kind === 'join' && !JOIN_DETAILS.some((value) => value === detail)) return { ok: false, reason: 'detail' };
  // 등록된 값만 그대로 두고, 그 밖의 글자는 안전한 모양으로만 남깁니다.
  if (kind !== 'join') detail = detail.replace(/[^a-zA-Z0-9가-힣._/-]/g, '').slice(0, LIMITS.detail);

  return { ok: true, value: { kind, detail, locale, title: text(raw.title, LIMITS.title), body, contact } };
}
