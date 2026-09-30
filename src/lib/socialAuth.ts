// 커뮤니티 로그인에 쓰는 로그인 수단(구글·카카오·애플)입니다.
//
// 세 곳 모두 "계정 번호(sub) 하나"만 받아 옵니다.
//   - 구글: scope=openid 만 요청 → 이메일·이름을 받지 않습니다.
//   - 카카오: 동의항목을 요청하지 않습니다 → 회원번호만 받습니다.
//   - 애플: scope 를 비워 요청 → 이메일·이름을 받지 않습니다. (애플의 '이메일 가리기'도 필요 없습니다)
// 받은 번호는 그대로 저장하지 않고 비밀값을 섞어 되돌릴 수 없는 값으로 바꿔 저장합니다. (googleAuth.ts 의 hashSub)
//
// 준비물 (Vercel 환경변수, 있는 것만 화면에 보입니다)
//   구글   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   카카오 KAKAO_CLIENT_ID (REST API 키), KAKAO_CLIENT_SECRET (카카오에서 켠 경우에만)
//   애플   APPLE_CLIENT_ID(서비스 ID), APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY(.p8 내용)
//   공통   COMMUNITY_SECRET
// docs/커뮤니티-설정.md 에 만드는 방법을 적어 두었습니다.

import { createSign } from 'node:crypto';
import { googleClientId, hashSub, looksLikeClientId } from './googleAuth';

export const PROVIDERS = ['google', 'kakao', 'apple'] as const;
export type Provider = (typeof PROVIDERS)[number];

/**
 * 사이트의 정식 주소입니다. (NEXT_PUBLIC_SITE_URL, 예: https://linkrights.org)
 *
 * 구글·카카오·애플에는 "돌아올 주소"를 미리 등록해 두는데, Vercel 미리보기 주소
 * (linkrights-xxxxx.vercel.app)는 배포할 때마다 바뀌어서 등록할 수 없습니다.
 * 그래서 미리보기 주소에서 로그인을 누르면 정식 주소로 옮겨 거기에서 로그인합니다.
 */
export function siteOrigin(): string {
  const value = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  return /^https?:\/\/[^/]+$/.test(value) ? value : '';
}

/** 내 컴퓨터에서 돌려보는 중인지 (이때는 그 주소를 그대로 씁니다) */
export function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
}

/**
 * 로그인에 써야 하는 주소를 정합니다.
 *   here 가 정식 주소이거나 내 컴퓨터면 그대로,
 *   미리보기 주소라면 정식 주소를 돌려줍니다. (그 주소로 옮겨야 로그인 창이 열립니다)
 */
export function loginOrigin(here: string): string {
  const canonical = siteOrigin();
  if (!canonical || isLocalOrigin(here) || here === canonical) return here;
  return canonical;
}

export function toProvider(value: unknown): Provider | null {
  return PROVIDERS.find((provider) => provider === value) ?? null;
}

const env = (name: string) => (process.env[name] ?? '').trim();

/** 이 로그인 수단을 쓸 수 있는지 (환경변수가 제대로 들어 있는지) */
export function providerReady(provider: Provider): boolean {
  if (provider === 'google') return looksLikeClientId(googleClientId()) && Boolean(env('GOOGLE_CLIENT_SECRET'));
  if (provider === 'kakao') return env('KAKAO_CLIENT_ID').length >= 16;
  return Boolean(env('APPLE_CLIENT_ID') && env('APPLE_TEAM_ID') && env('APPLE_KEY_ID') && env('APPLE_PRIVATE_KEY'));
}

/** 지금 쓸 수 있는 로그인 수단 (화면에 이 단추들만 보여 줍니다) */
export function readyProviders(): Provider[] {
  return PROVIDERS.filter((provider) => providerReady(provider));
}

/** 로그인하러 보낼 주소 */
export function authorizeUrl(provider: Provider, redirectUri: string, state: string): string {
  if (provider === 'kakao') {
    const params = new URLSearchParams({
      client_id: env('KAKAO_CLIENT_ID'),
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      // 동의항목을 요청하지 않습니다. (회원번호만 받습니다)
      prompt: 'select_account',
    });
    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }
  const params = new URLSearchParams({
    client_id: env('APPLE_CLIENT_ID'),
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    // scope 를 비워 두면 애플이 이름·이메일을 묻지 않고, 돌아올 때도 주소로 돌려줍니다(form_post 가 필요 없음).
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

/** base64url 로 바꿉니다. (JWT 에 씁니다) */
function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * 애플은 "보안 비밀" 자리에 우리가 직접 만든 JWT 를 넣어야 합니다.
 * .p8 열쇠로 서명하며, 6개월까지만 쓸 수 있어 요청할 때마다 새로 만듭니다.
 */
function appleClientSecret(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: env('APPLE_KEY_ID') };
  const payload = {
    iss: env('APPLE_TEAM_ID'),
    iat: now,
    exp: now + 300,
    aud: 'https://appleid.apple.com',
    sub: env('APPLE_CLIENT_ID'),
  };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  // 환경변수에 줄바꿈을 그대로 넣기 어려워 \n 으로 적은 경우도 받아 줍니다.
  const key = env('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  const signer = createSign('SHA256');
  signer.update(data);
  signer.end();
  // JWT 는 DER 이 아니라 r·s 를 이어 붙인 모양(ieee-p1363)을 씁니다.
  const signature = signer.sign({ key, dsaEncoding: 'ieee-p1363' });
  return `${data}.${base64url(signature)}`;
}

/** id_token 가운데 부분(내용)에서 계정 번호를 꺼냅니다. (우리 서버가 직접 받은 값이라 그대로 씁니다) */
function subFromIdToken(idToken: string, expectedAudience: string): string {
  const middle = idToken.split('.')[1];
  if (!middle) return '';
  try {
    const json = JSON.parse(Buffer.from(middle, 'base64url').toString('utf8')) as { sub?: string; aud?: string };
    if (json.aud !== expectedAudience) {
      console.error('[community] id_token 의 aud 가 설정과 다릅니다.');
      return '';
    }
    return typeof json.sub === 'string' ? json.sub : '';
  } catch (error) {
    console.error('[community] id_token 을 읽지 못했습니다:', error instanceof Error ? error.message : error);
    return '';
  }
}

/** 받은 code 를 계정 번호로 바꿉니다. 실패하면 빈 글자를 돌려주고 이유를 로그에 적습니다. */
export async function exchangeCode(provider: Provider, code: string, redirectUri: string): Promise<string> {
  const isKakao = provider === 'kakao';
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: isKakao ? env('KAKAO_CLIENT_ID') : env('APPLE_CLIENT_ID'),
  });
  if (isKakao) {
    // 카카오에서 보안 비밀을 켠 경우에만 넣습니다. (기본은 꺼져 있습니다)
    if (env('KAKAO_CLIENT_SECRET')) body.set('client_secret', env('KAKAO_CLIENT_SECRET'));
  } else {
    body.set('client_secret', appleClientSecret());
  }

  const endpoint = isKakao ? 'https://kauth.kakao.com/oauth/token' : 'https://appleid.apple.com/auth/token';
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (error) {
    console.error(`[community] ${provider} 에 연결하지 못했습니다:`, error instanceof Error ? error.message : error);
    return '';
  }
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    console.error(`[community] ${provider} 토큰 교환 실패 ${response.status}: ${detail}`);
    return '';
  }

  const data = (await response.json()) as { id_token?: string; access_token?: string };
  if (!isKakao) {
    if (!data.id_token) {
      console.error('[community] 애플 응답에 id_token 이 없습니다.');
      return '';
    }
    return subFromIdToken(data.id_token, env('APPLE_CLIENT_ID'));
  }

  // 카카오는 회원번호를 따로 물어봅니다. (동의항목 없이도 id 는 옵니다)
  if (!data.access_token) {
    console.error('[community] 카카오 응답에 access_token 이 없습니다.');
    return '';
  }
  const me = await fetch('https://kapi.kakao.com/v2/user/me', {
    method: 'GET',
    headers: { authorization: `Bearer ${data.access_token}` },
  }).catch(() => null);
  if (!me || !me.ok) {
    console.error('[community] 카카오 회원번호를 받지 못했습니다:', me ? me.status : '연결 실패');
    return '';
  }
  const profile = (await me.json()) as { id?: number | string };
  return profile.id === undefined || profile.id === null ? '' : String(profile.id);
}

/**
 * 로그인 수단별 식별값입니다.
 * 구글은 먼저 쓰던 방식을 그대로 두어야 이미 들어온 분들이 같은 사람으로 이어집니다.
 * 카카오·애플은 앞에 이름을 붙여, 번호가 우연히 같아도 다른 사람으로 봅니다.
 */
export function subHashFor(provider: Provider, sub: string): string {
  return provider === 'google' ? hashSub(sub) : hashSub(`${provider}:${sub}`);
}
