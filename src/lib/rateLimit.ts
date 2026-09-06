// AI 사용량을 제한해서 비용이 갑자기 늘어나는 것을 막는 곳입니다.
//
// 두 가지를 함께 봅니다.
//  1) 한 사람(같은 IP)이 짧은 시간에 너무 많이 묻는 경우
//  2) 하루 전체 질문 수가 정해둔 한도를 넘는 경우
//
// 참고: 서버가 여러 대로 나뉘어 실행되는 환경(Vercel 등)에서는 이 숫자가
// 서버마다 따로 세어질 수 있습니다. 즉 "대략적인 상한선"입니다.
// 정확한 상한이 필요해지면 OpenAI 대시보드의 월 예산 한도(Usage limits)를
// 함께 설정해 두는 것이 가장 확실합니다. (README 참고)

const WINDOW_MS = 5 * 60 * 1000; // 5분

const perIp = new Map<string, number[]>();
let dayKey = '';
let dayCount = 0;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function limitPerWindow(): number {
  const raw = Number(process.env.RATE_LIMIT_PER_WINDOW);
  return Number.isFinite(raw) && raw > 0 ? raw : 6;
}

function dailyLimit(): number {
  const raw = Number(process.env.DAILY_REQUEST_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? raw : 500;
}

export type LimitResult = { ok: true } | { ok: false; reason: 'rate_limit' | 'daily_limit' };

export function checkLimits(ip: string): LimitResult {
  const now = Date.now();

  // 하루 한도 확인 (날짜가 바뀌면 0으로 초기화)
  const key = todayKey();
  if (key !== dayKey) {
    dayKey = key;
    dayCount = 0;
  }
  if (dayCount >= dailyLimit()) {
    return { ok: false, reason: 'daily_limit' };
  }

  // 같은 사람의 짧은 시간 내 반복 요청 확인
  const history = (perIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (history.length >= limitPerWindow()) {
    perIp.set(ip, history);
    return { ok: false, reason: 'rate_limit' };
  }

  history.push(now);
  perIp.set(ip, history);
  dayCount += 1;

  // 메모리가 계속 늘어나지 않도록 오래된 기록을 정리합니다.
  if (perIp.size > 5000) {
    for (const [k, v] of perIp) {
      if (v.every((t) => now - t >= WINDOW_MS)) perIp.delete(k);
    }
  }

  return { ok: true };
}

/** 오늘 몇 번 사용했는지 (운영 확인용) */
export function usageToday(): { date: string; count: number; limit: number } {
  return { date: dayKey || todayKey(), count: dayCount, limit: dailyLimit() };
}
