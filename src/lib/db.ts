// 관리자 페이지용 데이터베이스입니다. (Vercel 마켓플레이스의 Neon Postgres)
//
// 중요: 데이터베이스는 "이용자가 보낸 글"과 "도움이 됐나요 집계"에만 씁니다.
//   - AI 질문과 답변 내용은 예전과 똑같이 저장하지 않습니다.
//   - 권리정보·기관 데이터는 그대로 content/*.json 에서만 옵니다.
//
// 환경변수 DATABASE_URL (또는 POSTGRES_URL) 이 없으면 hasDb() 가 false 가 되고,
// 사이트는 데이터베이스 없이 예전처럼 동작합니다. (글 보내기 칸 대신 메일 주소를 보여줍니다)

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { LIMITS, SUBMISSION_STATUSES, type SubmissionInput, type SubmissionStatus } from './submissions';

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? '';
}

export function hasDb(): boolean {
  return databaseUrl().startsWith('postgres');
}

let client: NeonQueryFunction<false, false> | null = null;
function db(): NeonQueryFunction<false, false> {
  if (!client) client = neon(databaseUrl());
  return client;
}

// 표를 만드는 일은 처음 한 번만 합니다. (서버가 다시 뜨면 다시 확인하지만, 이미 있으면 아무 일도 하지 않습니다)
let ready: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const sql = db();
      await sql`
        create table if not exists lr_submissions (
          id bigserial primary key,
          kind text not null,
          detail text not null default '',
          locale text not null default 'ko',
          title text not null default '',
          body text not null,
          contact text not null default '',
          status text not null default 'new',
          answer text not null default '',
          answered_at timestamptz,
          published boolean not null default false,
          created_at timestamptz not null default now()
        )`;
      await sql`create index if not exists lr_submissions_created_idx on lr_submissions (created_at desc)`;
      await sql`
        create table if not exists lr_helpful (
          day date not null,
          kind text not null,
          locale text not null,
          topic text not null,
          evidence text not null,
          helpful boolean not null,
          count integer not null default 0,
          primary key (day, kind, locale, topic, evidence, helpful)
        )`;
    })().catch((error) => {
      // 다음 요청에서 다시 시도할 수 있게 기억해 두지 않습니다.
      ready = null;
      throw error;
    });
  }
  return ready;
}

export interface SubmissionRow {
  id: number;
  kind: string;
  detail: string;
  locale: string;
  title: string;
  body: string;
  contact: string;
  status: SubmissionStatus;
  answer: string;
  answered_at: string | null;
  published: boolean;
  created_at: string;
}

/** 이용자가 보낸 글 한 건을 저장합니다. 저장한 접수 번호를 돌려줍니다. */
export async function insertSubmission(input: SubmissionInput): Promise<number> {
  await ensureSchema();
  const rows = (await db()`
    insert into lr_submissions (kind, detail, locale, title, body, contact)
    values (${input.kind}, ${input.detail}, ${input.locale}, ${input.title}, ${input.body}, ${input.contact})
    returning id`) as { id: number }[];
  return Number(rows[0].id);
}

/** 관리자 화면 목록 */
export async function listSubmissions(kind: string, limit = 200): Promise<SubmissionRow[]> {
  await ensureSchema();
  const rows =
    kind === 'all'
      ? await db()`
          select id, kind, detail, locale, title, body, contact, status, answer, published,
                 created_at::text as created_at, answered_at::text as answered_at
          from lr_submissions order by created_at desc limit ${limit}`
      : await db()`
          select id, kind, detail, locale, title, body, contact, status, answer, published,
                 created_at::text as created_at, answered_at::text as answered_at
          from lr_submissions where kind = ${kind} order by created_at desc limit ${limit}`;
  return rows as SubmissionRow[];
}

/**
 * 게시판에 보여줄, 운영팀이 올리기로 한 질문만.
 * 데이터베이스에 닿지 못해도 게시판(등록 글)은 그대로 보여야 하므로, 실패하면 빈 목록을 돌려줍니다.
 */
export async function listPublishedQuestions(limit = 100): Promise<SubmissionRow[]> {
  if (!hasDb()) return [];
  try {
    return await queryPublishedQuestions(limit);
  } catch (error) {
    console.error('[db] 게시판 글을 불러오지 못했습니다:', error instanceof Error ? error.message : error);
    return [];
  }
}

async function queryPublishedQuestions(limit: number): Promise<SubmissionRow[]> {
  await ensureSchema();
  const rows = await db()`
    select id, kind, detail, locale, title, body, '' as contact, status, answer, published,
           created_at::text as created_at, answered_at::text as answered_at
    from lr_submissions
    where kind = 'question' and published = true and status <> 'hidden'
    order by created_at desc limit ${limit}`;
  return rows as SubmissionRow[];
}

/** 게시판 글 한 건 (연락처는 화면에 쓰지 않으므로 가져오지 않습니다) */
export async function getPublishedQuestion(id: number): Promise<SubmissionRow | null> {
  if (!hasDb()) return null;
  try {
    return await queryPublishedQuestion(id);
  } catch (error) {
    console.error('[db] 게시판 글을 불러오지 못했습니다:', error instanceof Error ? error.message : error);
    return null;
  }
}

async function queryPublishedQuestion(id: number): Promise<SubmissionRow | null> {
  await ensureSchema();
  const rows = (await db()`
    select id, kind, detail, locale, title, body, '' as contact, status, answer, published,
           created_at::text as created_at, answered_at::text as answered_at
    from lr_submissions
    where id = ${id} and kind = 'question' and published = true and status <> 'hidden'`) as SubmissionRow[];
  return rows[0] ?? null;
}

/** 운영팀이 답변을 쓰거나 상태를 바꿉니다. */
export async function updateSubmission(
  id: number,
  patch: { answer?: string; status?: SubmissionStatus; published?: boolean; title?: string },
): Promise<void> {
  await ensureSchema();
  const sql = db();
  if (patch.answer !== undefined) {
    const answer = patch.answer.slice(0, LIMITS.answer);
    await sql`update lr_submissions set answer = ${answer}, answered_at = now() where id = ${id}`;
  }
  if (patch.title !== undefined) {
    await sql`update lr_submissions set title = ${patch.title.slice(0, LIMITS.title)} where id = ${id}`;
  }
  if (patch.status !== undefined && SUBMISSION_STATUSES.includes(patch.status)) {
    await sql`update lr_submissions set status = ${patch.status} where id = ${id}`;
  }
  if (patch.published !== undefined) {
    await sql`update lr_submissions set published = ${patch.published} where id = ${id}`;
  }
}

/** 운영팀이 글을 지웁니다. (이용자가 삭제를 요청했을 때도 이 기능으로 지웁니다) */
export async function deleteSubmission(id: number): Promise<void> {
  await ensureSchema();
  await db()`delete from lr_submissions where id = ${id}`;
}

/** "도움이 됐나요?" 집계를 하루·언어·분야별로 1 올립니다. (질문·답변 내용은 저장하지 않습니다) */
export async function countHelpful(input: {
  kind: string;
  locale: string;
  topic: string;
  evidence: string;
  helpful: boolean;
}): Promise<void> {
  await ensureSchema();
  await db()`
    insert into lr_helpful (day, kind, locale, topic, evidence, helpful, count)
    values (current_date, ${input.kind}, ${input.locale}, ${input.topic}, ${input.evidence}, ${input.helpful}, 1)
    on conflict (day, kind, locale, topic, evidence, helpful)
    do update set count = lr_helpful.count + 1`;
}

export interface HelpfulRow {
  day: string;
  kind: string;
  locale: string;
  topic: string;
  evidence: string;
  helpful: boolean;
  count: number;
}

export async function listHelpful(days = 60): Promise<HelpfulRow[]> {
  await ensureSchema();
  const rows = await db()`
    select day::text as day, kind, locale, topic, evidence, helpful, count from lr_helpful
    where day >= current_date - ${days}::integer
    order by day desc, count desc limit 1000`;
  return rows as HelpfulRow[];
}
