// 커뮤니티 글·댓글을 담는 곳입니다. (관리자 페이지와 같은 Neon Postgres)
//
// 저장하는 것: 별명, 글·댓글 내용, 올린 시각, 숨김 여부, 신고 수.
// 저장하지 않는 것: 이름, 이메일, 프로필 사진, 구글 계정 번호 원본. (sub_hash 만 저장합니다 — googleAuth.ts 참고)

import { COMMUNITY_LIMITS, makeNickname, type Board, type PostInput, type ReportReason } from './community';
import { ensureSchema, hasDb, sql } from './db';

let ready: Promise<void> | null = null;
/** 커뮤니티 표를 처음 한 번만 만듭니다. */
export function ensureCommunitySchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureSchema();
      const db = sql();
      await db`
        create table if not exists lr_members (
          id bigserial primary key,
          sub_hash text not null unique,
          nickname text not null,
          banned boolean not null default false,
          created_at timestamptz not null default now()
        )`;
      await db`
        create table if not exists lr_posts (
          id bigserial primary key,
          member_id bigint not null references lr_members(id) on delete cascade,
          board text not null default 'free',
          locale text not null default 'ko',
          title text not null,
          body text not null,
          hidden boolean not null default false,
          reports integer not null default 0,
          comment_count integer not null default 0,
          created_at timestamptz not null default now()
        )`;
      await db`create index if not exists lr_posts_created_idx on lr_posts (created_at desc)`;
      await db`
        create table if not exists lr_comments (
          id bigserial primary key,
          post_id bigint not null references lr_posts(id) on delete cascade,
          member_id bigint not null references lr_members(id) on delete cascade,
          body text not null,
          hidden boolean not null default false,
          reports integer not null default 0,
          created_at timestamptz not null default now()
        )`;
      await db`create index if not exists lr_comments_post_idx on lr_comments (post_id, created_at)`;
      await db`
        create table if not exists lr_reports (
          id bigserial primary key,
          member_id bigint not null references lr_members(id) on delete cascade,
          target_kind text not null,
          target_id bigint not null,
          created_at timestamptz not null default now(),
          unique (member_id, target_kind, target_id)
        )`;
      // 신고 이유 (욕설·광고·개인정보·기타). 먼저 만든 표에는 없어서 나중에 더합니다.
      await db`alter table lr_reports add column if not exists reason text`;
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export interface Member {
  id: number;
  nickname: string;
  banned: boolean;
}

/** 처음 들어온 사람이면 별명을 지어 등록하고, 이미 있으면 그대로 돌려줍니다. */
export async function findOrCreateMember(subHash: string): Promise<Member> {
  await ensureCommunitySchema();
  const db = sql();
  const found = (await db`select id, nickname, banned from lr_members where sub_hash = ${subHash}`) as Member[];
  if (found[0]) return found[0];
  // 별명이 겹치면 숫자를 바꿔 다시 시도합니다.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const nickname = makeNickname(Math.floor(Math.random() * 100000));
    const rows = (await db`
      insert into lr_members (sub_hash, nickname) values (${subHash}, ${nickname})
      on conflict (sub_hash) do update set sub_hash = excluded.sub_hash
      returning id, nickname, banned`) as Member[];
    if (rows[0]) return rows[0];
  }
  throw new Error('이용자를 만들지 못했습니다.');
}

export async function getMember(id: number): Promise<Member | null> {
  if (!hasDb()) return null;
  await ensureCommunitySchema();
  const rows = (await sql()`select id, nickname, banned from lr_members where id = ${id}`) as Member[];
  return rows[0] ?? null;
}

export async function setNickname(id: number, nickname: string): Promise<void> {
  await ensureCommunitySchema();
  await sql()`update lr_members set nickname = ${nickname} where id = ${id}`;
}

export interface PostRow {
  id: number;
  board: string;
  locale: string;
  title: string;
  body: string;
  nickname: string;
  member_id: number;
  hidden: boolean;
  reports: number;
  comment_count: number;
  created_at: string;
}

export interface CommentRow {
  id: number;
  post_id: number;
  member_id: number;
  nickname: string;
  body: string;
  hidden: boolean;
  reports: number;
  created_at: string;
}

const POST_COLUMNS = `p.id, p.board, p.locale, p.title, p.body, p.member_id, p.hidden, p.reports, p.comment_count,
  p.created_at::text as created_at, m.nickname`;

/** 글 목록 (숨긴 글은 빼고 최근 순) */
export async function listPosts(board: string, limit = 50): Promise<PostRow[]> {
  if (!hasDb()) return [];
  await ensureCommunitySchema();
  const db = sql();
  const rows =
    board === 'all'
      ? await db`
          select p.id, p.board, p.locale, p.title, p.body, p.member_id, p.hidden, p.reports, p.comment_count,
                 p.created_at::text as created_at, m.nickname
          from lr_posts p join lr_members m on m.id = p.member_id
          where p.hidden = false order by p.created_at desc limit ${limit}`
      : await db`
          select p.id, p.board, p.locale, p.title, p.body, p.member_id, p.hidden, p.reports, p.comment_count,
                 p.created_at::text as created_at, m.nickname
          from lr_posts p join lr_members m on m.id = p.member_id
          where p.hidden = false and p.board = ${board} order by p.created_at desc limit ${limit}`;
  return rows as PostRow[];
}

export async function getPost(id: number): Promise<PostRow | null> {
  if (!hasDb()) return null;
  await ensureCommunitySchema();
  const rows = (await sql()`
    select p.id, p.board, p.locale, p.title, p.body, p.member_id, p.hidden, p.reports, p.comment_count,
           p.created_at::text as created_at, m.nickname
    from lr_posts p join lr_members m on m.id = p.member_id
    where p.id = ${id}`) as PostRow[];
  return rows[0] ?? null;
}

export async function listComments(postId: number): Promise<CommentRow[]> {
  await ensureCommunitySchema();
  const rows = (await sql()`
    select c.id, c.post_id, c.member_id, c.body, c.hidden, c.reports, c.created_at::text as created_at, m.nickname
    from lr_comments c join lr_members m on m.id = c.member_id
    where c.post_id = ${postId} and c.hidden = false order by c.created_at asc limit 200`) as CommentRow[];
  return rows as CommentRow[];
}

export async function createPost(memberId: number, input: PostInput): Promise<number> {
  await ensureCommunitySchema();
  const rows = (await sql()`
    insert into lr_posts (member_id, board, locale, title, body)
    values (${memberId}, ${input.board}, ${input.locale}, ${input.title}, ${input.body})
    returning id`) as { id: number }[];
  return Number(rows[0].id);
}

export async function createComment(memberId: number, postId: number, body: string): Promise<number> {
  await ensureCommunitySchema();
  const db = sql();
  const rows = (await db`
    insert into lr_comments (post_id, member_id, body) values (${postId}, ${memberId}, ${body})
    returning id`) as { id: number }[];
  await db`update lr_posts set comment_count = comment_count + 1 where id = ${postId}`;
  return Number(rows[0].id);
}

/** 본인 글·댓글 지우기 (남의 것은 지울 수 없습니다) */
export async function removeOwn(kind: 'post' | 'comment', id: number, memberId: number): Promise<boolean> {
  await ensureCommunitySchema();
  const db = sql();
  if (kind === 'post') {
    const rows = (await db`delete from lr_posts where id = ${id} and member_id = ${memberId} returning id`) as {
      id: number;
    }[];
    return rows.length > 0;
  }
  const rows = (await db`
    delete from lr_comments where id = ${id} and member_id = ${memberId} returning post_id`) as { post_id: number }[];
  if (rows.length === 0) return false;
  await db`update lr_posts set comment_count = greatest(comment_count - 1, 0) where id = ${rows[0].post_id}`;
  return true;
}

/**
 * 신고하기. 같은 사람이 같은 글을 여러 번 신고해도 한 번만 셉니다.
 * 신고가 쌓이면 자동으로 숨기고, 운영팀이 관리자 페이지에서 확인합니다.
 */
export async function report(
  kind: 'post' | 'comment',
  id: number,
  memberId: number,
  reason: ReportReason,
): Promise<number> {
  await ensureCommunitySchema();
  const db = sql();
  const inserted = (await db`
    insert into lr_reports (member_id, target_kind, target_id, reason) values (${memberId}, ${kind}, ${id}, ${reason})
    on conflict (member_id, target_kind, target_id) do nothing returning id`) as { id: number }[];
  if (inserted.length === 0) {
    const rows =
      kind === 'post'
        ? ((await db`select reports from lr_posts where id = ${id}`) as { reports: number }[])
        : ((await db`select reports from lr_comments where id = ${id}`) as { reports: number }[]);
    return rows[0]?.reports ?? 0;
  }
  const limit = COMMUNITY_LIMITS.hideAfterReports;
  const rows =
    kind === 'post'
      ? ((await db`
          update lr_posts set reports = reports + 1, hidden = (reports + 1 >= ${limit})
          where id = ${id} returning reports`) as { reports: number }[])
      : ((await db`
          update lr_comments set reports = reports + 1, hidden = (reports + 1 >= ${limit})
          where id = ${id} returning reports`) as { reports: number }[]);
  return rows[0]?.reports ?? 0;
}

/** 운영팀: 숨기기·되살리기·차단 */
export async function moderate(action: {
  kind: 'post' | 'comment' | 'member';
  id: number;
  hidden?: boolean;
  banned?: boolean;
  remove?: boolean;
}): Promise<void> {
  await ensureCommunitySchema();
  const db = sql();
  if (action.kind === 'member') {
    await db`update lr_members set banned = ${action.banned === true} where id = ${action.id}`;
    return;
  }
  if (action.remove) {
    if (action.kind === 'post') await db`delete from lr_posts where id = ${action.id}`;
    else await db`delete from lr_comments where id = ${action.id}`;
    return;
  }
  const hidden = action.hidden === true;
  if (action.kind === 'post') await db`update lr_posts set hidden = ${hidden} where id = ${action.id}`;
  else await db`update lr_comments set hidden = ${hidden} where id = ${action.id}`;
}

/** 관리자 화면: 신고된 글·댓글과 최근 글 (신고 이유도 함께) */
export async function listForAdmin(): Promise<{
  posts: PostRow[];
  comments: CommentRow[];
  reasons: { target_kind: string; target_id: number; reason: string; count: number }[];
}> {
  await ensureCommunitySchema();
  const db = sql();
  const posts = (await db`
    select p.id, p.board, p.locale, p.title, p.body, p.member_id, p.hidden, p.reports, p.comment_count,
           p.created_at::text as created_at, m.nickname
    from lr_posts p join lr_members m on m.id = p.member_id
    order by p.reports desc, p.created_at desc limit 100`) as PostRow[];
  const comments = (await db`
    select c.id, c.post_id, c.member_id, c.body, c.hidden, c.reports, c.created_at::text as created_at, m.nickname
    from lr_comments c join lr_members m on m.id = c.member_id
    order by c.reports desc, c.created_at desc limit 100`) as CommentRow[];
  const reasons = (await db`
    select target_kind, target_id, coalesce(reason, 'other') as reason, count(*)::int as count
    from lr_reports group by target_kind, target_id, coalesce(reason, 'other')
    order by count desc limit 200`) as { target_kind: string; target_id: number; reason: string; count: number }[];
  return { posts, comments, reasons };
}

export type { Board };
