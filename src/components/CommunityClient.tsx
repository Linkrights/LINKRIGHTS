'use client';

// 이야기 나누기(커뮤니티) 화면에서 브라우저가 맡는 일입니다.
//  - 글 쓰기 / 댓글 쓰기 / 신고 / 내 글 지우기 / 별명 바꾸기 / 로그아웃
// 목록과 글 내용은 서버가 그려서 보내고, 여기에서는 "누르면 일어나는 일"만 맡습니다.
//
// 글을 올리기 전에 전화번호·등록번호처럼 보이는 글자가 있으면 먼저 알려 줍니다. (privacy-detect)

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Icon } from './Icon';
import { findPersonalInfo, removePersonalInfo } from './privacy-detect';
import { BOARDS, COMMUNITY_LIMITS, REPORT_REASONS, type Board, type ReportReason } from '@/lib/community';
import type { Messages } from '@/lib/i18n';

type Labels = Messages['community'];

async function send(payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string; nickname?: string }> {
  try {
    const response = await fetch('/api/community', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; nickname?: string };
    return { ok: response.ok && data.ok !== false, error: data.error, nickname: data.nickname };
  } catch {
    return { ok: false, error: 'network' };
  }
}

function errorText(labels: Labels, error?: string): string {
  if (error === 'rate_limit') return labels.rateLimit;
  if (error === 'banned') return labels.banned;
  return labels.error;
}

/** 글 쓰기 칸 */
export function CommunityWrite({ labels, locale, board }: { labels: Labels; locale: string; board: Board }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [chosen, setChosen] = useState<Board>(board);
  const [state, setState] = useState<'idle' | 'sending'>('idle');
  const [error, setError] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const matches = findPersonalInfo(body);
  const boardLabel: Record<Board, string> = { free: labels.boardFree, ask: labels.boardAsk, info: labels.boardInfo };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError('');
    const result = await send({ action: 'post', board: chosen, title, body, locale });
    setState('idle');
    if (!result.ok) {
      setError(errorText(labels, result.error));
      return;
    }
    setTitle('');
    setBody('');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="lr-card space-y-4 p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-ink-900">{labels.writeTitle}</h2>

      <div className="flex flex-wrap gap-2">
        {BOARDS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setChosen(key)}
            aria-pressed={chosen === key}
            className={`lr-btn lr-btn-sm ${chosen === key ? 'lr-btn-primary' : 'lr-btn-ghost'}`}
          >
            {boardLabel[key]}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="community-title" className="block text-[15px] font-semibold text-ink-900">
          {labels.postTitleLabel}
        </label>
        <input
          id="community-title"
          value={title}
          maxLength={COMMUNITY_LIMITS.title}
          required
          onChange={(event) => setTitle(event.target.value)}
          placeholder={labels.postTitlePlaceholder}
          className="lr-input mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="community-body" className="block text-[15px] font-semibold text-ink-900">
          {labels.postBodyLabel}
        </label>
        <textarea
          id="community-body"
          ref={bodyRef}
          value={body}
          rows={6}
          maxLength={COMMUNITY_LIMITS.body}
          required
          onChange={(event) => setBody(event.target.value)}
          placeholder={labels.postBodyPlaceholder}
          className="lr-input mt-1.5 resize-y"
        />
      </div>

      <div aria-live="polite">
        {matches.length > 0 && (
          <div className="rounded-[var(--radius-control)] border border-[var(--color-warm-500)] bg-warm-100 p-4">
            <p className="flex items-start gap-2 text-[15px] font-bold text-ink-900">
              <Icon name="shield" size={18} className="mt-0.5 shrink-0" /> <span>{labels.privacyTitle}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setBody(removePersonalInfo(body, matches));
                bodyRef.current?.focus();
              }}
              className="lr-btn lr-btn-ghost lr-btn-sm mt-3"
            >
              {labels.privacyRemove}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state === 'sending'} className="lr-btn lr-btn-primary lr-press">
          {state === 'sending' ? labels.sending : labels.submit} <Icon name="arrow-right" size={18} />
        </button>
        <p aria-live="polite" className="text-[15px] font-semibold text-[var(--color-danger-700)]">
          {error}
        </p>
      </div>
    </form>
  );
}

/** 댓글 쓰기 칸 */
export function CommunityComment({ labels, postId }: { labels: Labels; postId: number }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'sending'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError('');
    const result = await send({ action: 'comment', postId, body });
    setState('idle');
    if (!result.ok) {
      setError(errorText(labels, result.error));
      return;
    }
    setBody('');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4">
      <label htmlFor="community-comment" className="block text-[15px] font-semibold text-ink-900">
        {labels.commentLabel}
      </label>
      <textarea
        id="community-comment"
        value={body}
        rows={3}
        maxLength={COMMUNITY_LIMITS.comment}
        required
        onChange={(event) => setBody(event.target.value)}
        placeholder={labels.commentPlaceholder}
        className="lr-input mt-1.5 resize-y"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state === 'sending'} className="lr-btn lr-btn-primary lr-btn-sm lr-press">
          {state === 'sending' ? labels.sending : labels.commentSubmit}
        </button>
        <p aria-live="polite" className="text-[15px] font-semibold text-[var(--color-danger-700)]">
          {error}
        </p>
      </div>
    </form>
  );
}

/** 글·댓글 아래의 작은 단추 (신고 / 내 글 지우기) */
export function CommunityItemActions({
  labels,
  kind,
  id,
  mine,
  backToList = false,
}: {
  labels: Labels;
  kind: 'post' | 'comment';
  id: number;
  mine: boolean;
  /** 글을 지운 뒤 목록으로 돌아갈지 */
  backToList?: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState('');
  // 신고는 누르자마자 보내지 않고, 먼저 이유를 고르는 창을 엽니다.
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);

  const reasonLabels: Record<ReportReason, string> = {
    abuse: labels.reportAbuse,
    ad: labels.reportAd,
    privacy: labels.reportPrivacy,
    other: labels.reportOther,
  };

  async function sendReport(reason: ReportReason) {
    if (sending) return;
    setSending(true);
    const result = await send({ action: 'report', kind, id, reason });
    setSending(false);
    setAsking(false);
    if (result.ok) {
      setDone(labels.reportDone);
      router.refresh();
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-3 text-[13px] text-ink-500">
      {mine ? (
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(labels.removeConfirm)) return;
            const result = await send({ action: 'remove', kind, id });
            if (result.ok) {
              if (backToList) router.push('../community');
              router.refresh();
            }
          }}
          className="hover:text-[var(--color-danger-700)] hover:underline"
        >
          {labels.remove}
        </button>
      ) : (
        <button type="button" onClick={() => setAsking(true)} className="hover:text-ink-900 hover:underline">
          {labels.report}
        </button>
      )}
      {done && <span className="text-brand-700">{done}</span>}

      {/* 신고 이유 고르기 */}
      {asking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.reportTitle}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAsking(false);
          }}
        >
          <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-white p-5 shadow-lg">
            <p className="text-base font-extrabold text-ink-900">{labels.reportTitle}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{labels.reportNote}</p>
            <ul className="mt-4 space-y-2">
              {REPORT_REASONS.map((reason) => (
                <li key={reason}>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => sendReport(reason)}
                    className="lr-btn lr-btn-ghost w-full justify-start text-left"
                  >
                    {reasonLabels[reason]}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setAsking(false)} className="lr-btn lr-btn-ghost lr-btn-sm mt-3 w-full">
              {labels.reportCancel}
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

/** 내 별명 + 로그아웃 */
export function CommunityMe({ labels, nickname }: { labels: Labels; nickname: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(nickname);
  const [error, setError] = useState('');

  return (
    <div className="lr-card flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm text-ink-500">{labels.nicknameLabel}</p>
        {editing ? (
          <form
            className="mt-1 flex flex-wrap items-center gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              setError('');
              const result = await send({ action: 'nickname', nickname: value });
              if (!result.ok) {
                setError(labels.nicknameNote);
                return;
              }
              setEditing(false);
              router.refresh();
            }}
          >
            <input
              value={value}
              maxLength={COMMUNITY_LIMITS.nickname}
              onChange={(event) => setValue(event.target.value)}
              className="lr-input max-w-[12rem] py-2"
              aria-label={labels.nicknameLabel}
            />
            <button type="submit" className="lr-btn lr-btn-primary lr-btn-sm">
              {labels.nicknameSave}
            </button>
          </form>
        ) : (
          <p className="text-base font-bold text-ink-900">{nickname}</p>
        )}
        {error ? (
          <p className="mt-1 text-[13px] text-[var(--color-danger-700)]">{error}</p>
        ) : (
          <p className="mt-1 text-[13px] text-ink-500">{labels.nicknameNote}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="lr-btn lr-btn-ghost lr-btn-sm">
            {labels.nicknameChange}
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            await send({ action: 'logout' });
            router.refresh();
          }}
          className="lr-btn lr-btn-ghost lr-btn-sm"
        >
          {labels.logout}
        </button>
      </div>
    </div>
  );
}
