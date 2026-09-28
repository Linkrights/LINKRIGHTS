// 커뮤니티 로그인(구글)입니다. 승인 절차 없이, 구글 계정으로 들어오면 바로 쓸 수 있습니다.
//
// 무엇을 저장하나요?
//   구글이 알려주는 계정 번호(sub)를 그대로 저장하지 않고, 비밀값을 섞어 한 방향으로 바꾼 값(sub_hash)만 저장합니다.
//   이름·이메일·프로필 사진은 받아오더라도 저장하지 않습니다. 화면에는 이용자가 정한 별명만 보입니다.
//   (누가 누구인지 우리 쪽에서 알아볼 수 없고, 같은 사람이 다시 들어왔을 때 같은 별명을 쓰게 하기 위한 것입니다)
//
// 왜 라이브러리를 쓰지 않았나요?
//   구글 로그인 한 가지만 쓰므로, 필요한 세 단계(보내기 → 받기 → 쪽지 만들기)만 직접 적었습니다.
//   토큰은 우리 서버가 구글과 직접(HTTPS) 주고받으므로, 받은 id_token 의 내용을 그대로 씁니다. (구글 문서의 권장 방식)
//
// 준비물 (Vercel 환경변수)
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET : Google Cloud Console 에서 만든 OAuth 클라이언트
//   COMMUNITY_SECRET                       : 쪽지(쿠키) 서명과 sub 변환에 쓰는 아무도 모르는 긴 글자
// 셋 중 하나라도 없으면 커뮤니티는 꺼진 상태로 보입니다.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'lr-community';
export const STATE_COOKIE = 'lr-community-state';
/** 로그인 유지 기간 (30일) */
const SESSION_SECONDS = 30 * 24 * 60 * 60;
/** 로그인하러 갔다 오는 동안만 쓰는 값 (10분) */
const STATE_SECONDS = 10 * 60;

export function googleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID ?? '').trim();
}

function googleClientSecret(): string {
  return (process.env.GOOGLE_CLIENT_SECRET ?? '').trim();
}

function secret(): string {
  return process.env.COMMUNITY_SECRET ?? '';
}

/**
 * 구글이 만들어 주는 클라이언트 ID 모양인지 봅니다.
 *   123456789012-abcdefg....apps.googleusercontent.com
 * 프로젝트 이름이나 앱 이름을 잘못 넣으면 구글이 "The OAuth client was not found"(401) 를 돌려주므로,
 * 그런 값은 아예 보내지 않고 "준비 중"으로 남겨 둡니다. (이용자가 오류 화면을 보지 않도록)
 */
export function looksLikeClientId(value: string): boolean {
  return value.endsWith('.apps.googleusercontent.com') && value.length > 30 && !/\s/.test(value);
}

/** 무엇이 잘못됐는지 (Vercel 로그와 검사에서 씁니다). 준비가 끝났으면 빈 목록입니다. */
export function communityAuthProblems(): string[] {
  const problems: string[] = [];
  const id = googleClientId();
  if (!id) problems.push('GOOGLE_CLIENT_ID 가 없습니다.');
  else if (!looksLikeClientId(id)) {
    problems.push(
      'GOOGLE_CLIENT_ID 가 구글 클라이언트 ID 모양이 아닙니다. ' +
        'Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 에서 ' +
        '".apps.googleusercontent.com" 으로 끝나는 값을 복사해 넣으세요. (프로젝트·앱 이름이 아닙니다)',
    );
  }
  if (!googleClientSecret()) problems.push('GOOGLE_CLIENT_SECRET 이 없습니다.');
  else if (googleClientSecret().length < 10) problems.push('GOOGLE_CLIENT_SECRET 이 너무 짧습니다. (보통 GOCSPX- 로 시작합니다)');
  if (secret().length < 16) problems.push('COMMUNITY_SECRET 이 없거나 너무 짧습니다. (16자 이상)');
  return problems;
}

let warned = false;

/** 커뮤니티를 켤 수 있는 상태인지 (준비물이 모두 제대로 들어 있는지) */
export function hasCommunityAuth(): boolean {
  const problems = communityAuthProblems();
  if (problems.length > 0) {
    // 로그에 한 번만 남깁니다. (docs/커뮤니티-설정.md 참고)
    if (!warned) {
      warned = true;
      for (const problem of problems) console.warn('[community]', problem);
    }
    return false;
  }
  return true;
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** 구글 계정 번호를 우리 쪽 식별값으로 바꿉니다. (되돌릴 수 없습니다) */
export function hashSub(sub: string): string {
  return createHmac('sha256', `${secret()}:sub`).update(sub).digest('hex');
}

/** 로그인하러 보낼 주소를 만듭니다. state 는 돌아올 때 같은 브라우저인지 확인하는 값입니다. */
export function authorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    // 계정 번호만 필요합니다. 이메일·이름은 요청하지 않습니다.
    scope: 'openid',
    state,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function createState(now = Date.now()): { value: string; maxAge: number } {
  const raw = `${Math.floor(now / 1000) + STATE_SECONDS}.${randomBytes(12).toString('hex')}`;
  return { value: `${raw}.${sign(raw)}`, maxAge: STATE_SECONDS };
}

export function verifyState(value: string | undefined, now = Date.now()): boolean {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [expires, nonce, signature] = parts;
  if (!/^\d+$/.test(expires) || Number(expires) * 1000 < now) return false;
  return sameString(signature, sign(`${expires}.${nonce}`));
}

/**
 * 구글에서 받은 code 를 계정 번호(sub)로 바꿉니다.
 * 실패하면 빈 글자를 돌려주고, 무엇이 잘못됐는지 로그에 남깁니다.
 * (구글이 돌려주는 error 는 비밀값이 아니라 "왜 거절했는지"이며, 우리 보안 비밀은 로그에 남기지 않습니다)
 */
export async function exchangeCodeForSub(code: string, redirectUri: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId(),
        client_secret: googleClientSecret(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
  } catch (error) {
    console.error('[community] 구글에 연결하지 못했습니다:', error instanceof Error ? error.message : error);
    return '';
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    let detail = body.slice(0, 300);
    try {
      const parsed = JSON.parse(body) as { error?: string; error_description?: string };
      detail = `${parsed.error ?? ''} ${parsed.error_description ?? ''}`.trim();
      if (parsed.error === 'invalid_client') {
        detail += ' — GOOGLE_CLIENT_SECRET 이 이 클라이언트 ID 의 보안 비밀이 맞는지 확인하세요.';
      }
      if (parsed.error === 'redirect_uri_mismatch') {
        detail += ` — Google Cloud Console 의 승인된 리디렉션 URI 에 ${redirectUri} 가 있어야 합니다.`;
      }
      if (parsed.error === 'invalid_grant') {
        detail += ' — 이미 쓴 code 이거나 시간이 지난 code 입니다. 다시 로그인해 보세요.';
      }
    } catch {
      /* 그대로 둡니다 */
    }
    console.error(`[community] 구글 토큰 교환 실패 ${response.status}: ${detail}`);
    return '';
  }
  const data = (await response.json()) as { id_token?: string };
  if (!data.id_token) {
    console.error('[community] 구글 응답에 id_token 이 없습니다.');
    return '';
  }
  // id_token 은 점 세 개로 나뉜 값이며, 가운데가 내용입니다. (구글과 직접 주고받았으므로 그대로 씁니다)
  const middle = data.id_token.split('.')[1];
  if (!middle) return '';
  try {
    const json = JSON.parse(Buffer.from(middle, 'base64url').toString('utf8')) as { sub?: string; aud?: string };
    if (json.aud !== googleClientId()) {
      console.error('[community] id_token 의 aud 가 GOOGLE_CLIENT_ID 와 다릅니다.');
      return '';
    }
    return typeof json.sub === 'string' ? json.sub : '';
  } catch (error) {
    console.error('[community] id_token 을 읽지 못했습니다:', error instanceof Error ? error.message : error);
    return '';
  }
}

/** 로그인 쪽지를 만듭니다. (우리 쪽 이용자 번호 + 만료 시각 + 서명) */
export function createSession(userId: number, now = Date.now()): { value: string; maxAge: number } {
  const raw = `${userId}.${Math.floor(now / 1000) + SESSION_SECONDS}`;
  return { value: `${raw}.${sign(raw)}`, maxAge: SESSION_SECONDS };
}

/** 쪽지가 우리가 만든 것이고 아직 살아 있으면 이용자 번호를 돌려줍니다. */
export function readSession(value: string | undefined, now = Date.now()): number | null {
  if (!hasCommunityAuth() || !value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [id, expires, signature] = parts;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(expires)) return null;
  if (Number(expires) * 1000 < now) return null;
  if (!sameString(signature, sign(`${id}.${expires}`))) return null;
  return Number(id);
}
