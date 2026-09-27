// 관리자 페이지 로그인입니다.
//
// 계정을 따로 만들지 않고, 환경변수 ADMIN_PASSWORD 에 넣어 둔 비밀번호 하나로 들어갑니다.
//   - 비밀번호는 코드에 넣지 않습니다. Vercel 프로젝트 설정 > Environment Variables 에서 넣고 바꿉니다.
//   - 로그인하면 서명한 쪽지(쿠키)를 12시간 동안 줍니다. 쪽지에는 비밀번호가 들어 있지 않습니다.
//   - 비밀번호를 바꾸면 이미 나간 쪽지는 모두 무효가 됩니다. (서명 열쇠가 비밀번호이기 때문입니다)
//   - 비교는 createHmac + timingSafeEqual 로 하여 글자를 하나씩 맞춰 보는 공격을 막습니다.

import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'lr-admin';
/** 로그인 유지 시간 */
const MAX_AGE_SECONDS = 12 * 60 * 60;

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? '';
}

/** 관리자 기능을 켤 수 있는 상태인지 (비밀번호가 너무 짧으면 켜지 않습니다) */
export function hasAdmin(): boolean {
  return adminPassword().length >= 8;
}

function sign(value: string): string {
  return createHmac('sha256', adminPassword()).update(value).digest('hex');
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** 비밀번호가 맞는지 확인합니다. */
export function checkPassword(input: unknown): boolean {
  if (!hasAdmin() || typeof input !== 'string') return false;
  return sameString(input, adminPassword());
}

/** 로그인 쪽지를 만듭니다. (언제까지 쓸 수 있는지 + 서명) */
export function createToken(now = Date.now()): { value: string; maxAge: number } {
  const expires = Math.floor(now / 1000) + MAX_AGE_SECONDS;
  return { value: `${expires}.${sign(String(expires))}`, maxAge: MAX_AGE_SECONDS };
}

/** 쪽지가 우리가 만든 것이고 아직 시간이 남았는지 확인합니다. */
export function verifyToken(token: string | undefined, now = Date.now()): boolean {
  if (!hasAdmin() || !token) return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature) return false;
  if (!/^\d+$/.test(expires) || Number(expires) * 1000 < now) return false;
  return sameString(signature, sign(expires));
}
