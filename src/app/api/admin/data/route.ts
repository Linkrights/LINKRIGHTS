// 관리자 페이지가 목록을 받아 가는 곳입니다. (로그인한 사람만)
//
// GET  /api/admin/data?tab=question|join|correction|all|helpful
// POST /api/admin/data   { id, answer?, status?, published?, title?, remove? }

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, hasAdmin, verifyToken } from '@/lib/adminAuth';
import { listForAdmin, moderate } from '@/lib/communityDb';
import { deleteSubmission, hasDb, listHelpful, listSubmissions, updateSubmission } from '@/lib/db';
import { SUBMISSION_KINDS, SUBMISSION_STATUSES, type SubmissionStatus } from '@/lib/submissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loggedIn(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value);
}

/** 관리자 페이지가 처음에 알아야 하는 것: 준비가 됐는지, 로그인했는지 */
function setupState() {
  return { admin: hasAdmin(), db: hasDb() };
}

export async function GET(request: Request) {
  if (!(await loggedIn())) return NextResponse.json({ error: 'auth', ...setupState() }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: 'db', ...setupState() }, { status: 503 });

  const tab = new URL(request.url).searchParams.get('tab') ?? 'question';
  try {
    if (tab === 'helpful') return NextResponse.json({ ok: true, helpful: await listHelpful() });
    // 이야기 나누기(커뮤니티): 신고가 많은 글·댓글이 위로 옵니다.
    if (tab === 'community') return NextResponse.json({ ok: true, community: await listForAdmin() });
    const kind = SUBMISSION_KINDS.find((value) => value === tab) ?? 'all';
    return NextResponse.json({ ok: true, rows: await listSubmissions(kind) });
  } catch (error) {
    console.error('[admin] 목록을 불러오지 못했습니다:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await loggedIn())) return NextResponse.json({ error: 'auth' }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: 'db' }, { status: 503 });

  let payload: {
    id?: unknown;
    answer?: unknown;
    status?: unknown;
    published?: unknown;
    title?: unknown;
    remove?: unknown;
    /** 이야기 나누기 관리: 'post' | 'comment' | 'member' */
    community?: unknown;
    hidden?: unknown;
    banned?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'payload' }, { status: 400 });
  }

  const id = Number(payload.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'id' }, { status: 400 });

  // 이야기 나누기(커뮤니티) 글·댓글 숨기기·지우기, 이용자 차단
  if (payload.community === 'post' || payload.community === 'comment' || payload.community === 'member') {
    try {
      await moderate({
        kind: payload.community,
        id,
        hidden: payload.hidden === true,
        banned: payload.banned === true,
        remove: payload.remove === true,
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error('[admin] 커뮤니티 관리 실패:', error instanceof Error ? error.message : error);
      return NextResponse.json({ error: 'server' }, { status: 500 });
    }
  }

  try {
    if (payload.remove === true) {
      await deleteSubmission(id);
      return NextResponse.json({ ok: true, removed: id });
    }
    const status = SUBMISSION_STATUSES.find((value) => value === payload.status) as SubmissionStatus | undefined;
    await updateSubmission(id, {
      answer: typeof payload.answer === 'string' ? payload.answer : undefined,
      title: typeof payload.title === 'string' ? payload.title : undefined,
      status,
      published: typeof payload.published === 'boolean' ? payload.published : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin] 저장하지 못했습니다:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
