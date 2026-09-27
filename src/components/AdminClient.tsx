'use client';

// 관리자 화면입니다. 운영팀만 씁니다. (문구는 한국어 하나로 둡니다)
//
// 화면 구성
//   비밀번호 입력 → 묶음 고르기(질문 / 참여 문의 / 정보 수정 제보 / 도움이 됐나요) → 글 읽고 답하기
// 할 수 있는 일
//   답변 쓰기 · 상태 바꾸기(새 글/답변함/숨김/스팸) · 질문을 게시판에 올리기 · 글 지우기
// 주의
//   여기 보이는 연락처는 이용자가 답장을 받으려고 적어 준 것입니다. 다른 곳에 옮겨 적지 마세요.

import { useCallback, useEffect, useState } from 'react';

interface Row {
  id: number;
  kind: string;
  detail: string;
  locale: string;
  title: string;
  body: string;
  contact: string;
  status: string;
  answer: string;
  answered_at: string | null;
  published: boolean;
  created_at: string;
}

interface HelpfulRow {
  day: string;
  kind: string;
  locale: string;
  topic: string;
  evidence: string;
  helpful: boolean;
  count: number;
}

const TABS = [
  { key: 'question', label: '질문' },
  { key: 'join', label: '참여 문의' },
  { key: 'correction', label: '정보 수정 제보' },
  { key: 'helpful', label: '도움이 됐나요' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  new: '새 글',
  answered: '답변함',
  hidden: '숨김',
  spam: '스팸',
};

const JOIN_LABELS: Record<string, string> = {
  mentee: '멘티(청소년)',
  mentor: '대학생 멘토',
  partner: '학교·기관',
  // 정보 수정 제보가 어느 화면에서 왔는지
  material: '자료 추가 요청',
  organizations: '도움받을 수 있는 곳 화면',
  ask: 'AI 답변 화면',
};

export function AdminClient({ ready }: { ready: { admin: boolean; db: boolean } }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<string>('question');
  const [rows, setRows] = useState<Row[]>([]);
  const [helpful, setHelpful] = useState<HelpfulRow[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (which: string) => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/data?tab=${which}`, { cache: 'no-store' });
      if (response.status === 401) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { rows?: Row[]; helpful?: HelpfulRow[]; error?: string };
      if (data.error) setMessage(data.error === 'db' ? '데이터베이스가 연결되어 있지 않습니다.' : '불러오지 못했습니다.');
      setRows(data.rows ?? []);
      setHelpful(data.helpful ?? []);
      setAuthed(true);
    } catch {
      setMessage('불러오지 못했습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setMessage(response.status === 429 ? '잠시 뒤에 다시 해 주세요.' : '비밀번호가 맞지 않습니다.');
      return;
    }
    setPassword('');
    await load(tab);
  }

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setAuthed(false);
    setRows([]);
    setHelpful([]);
  }

  async function save(id: number, patch: Record<string, unknown>) {
    setMessage('');
    const response = await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!response.ok) {
      setMessage('저장하지 못했습니다.');
      return;
    }
    setMessage(`#${id} 저장했습니다.`);
    await load(tab);
  }

  if (!ready.admin || !ready.db) {
    return (
      <main className="lr-container-narrow py-16">
        <h1 className="lr-h1">LINKRIGHTS 관리자</h1>
        <div className="lr-card mt-6 p-6">
          <p className="text-[17px] font-bold text-ink-900">아직 준비가 끝나지 않았습니다.</p>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-ink-700">
            <li>{ready.db ? '✅' : '⬜'} DATABASE_URL — Vercel 마켓플레이스에서 Neon Postgres 를 연결하세요.</li>
            <li>{ready.admin ? '✅' : '⬜'} ADMIN_PASSWORD — 8자 이상으로 정해 환경변수에 넣으세요.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-ink-500">
            두 값을 넣은 뒤 Vercel 에서 다시 배포(Redeploy)하면 이 화면이 열립니다. 그 전까지 사이트의 문의 칸은 예전처럼
            메일 주소를 보여줍니다.
          </p>
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="lr-container-narrow py-16">
        <h1 className="lr-h1">LINKRIGHTS 관리자</h1>
        <form onSubmit={login} className="lr-card mt-6 space-y-3 p-6">
          <label htmlFor="admin-password" className="block text-[15px] font-semibold text-ink-900">
            관리자 비밀번호
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="lr-input"
          />
          <button type="submit" className="lr-btn lr-btn-primary">
            들어가기
          </button>
          {message && <p className="text-[15px] font-semibold text-[var(--color-danger-700)]">{message}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="lr-container py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="lr-h2">LINKRIGHTS 관리자</h1>
        <button type="button" onClick={logout} className="lr-btn lr-btn-ghost lr-btn-sm">
          나가기
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`lr-btn lr-btn-sm ${tab === item.key ? 'lr-btn-primary' : 'lr-btn-ghost'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-3 text-[15px] font-semibold text-brand-700">
        {loading ? '불러오는 중…' : message}
      </p>

      {tab === 'helpful' ? (
        <div className="lr-card mt-4 overflow-x-auto p-4">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-ink-500">
                <th className="py-2 pr-3">날짜</th>
                <th className="py-2 pr-3">종류</th>
                <th className="py-2 pr-3">언어</th>
                <th className="py-2 pr-3">분야·권리정보</th>
                <th className="py-2 pr-3">근거</th>
                <th className="py-2 pr-3">평가</th>
                <th className="py-2">횟수</th>
              </tr>
            </thead>
            <tbody>
              {helpful.map((row) => (
                <tr key={`${row.day}-${row.kind}-${row.locale}-${row.topic}-${row.evidence}-${String(row.helpful)}`} className="border-b border-[var(--color-line)]">
                  <td className="py-2 pr-3">{row.day.slice(0, 10)}</td>
                  <td className="py-2 pr-3">{row.kind === 'ai' ? 'AI 답변' : '권리정보'}</td>
                  <td className="py-2 pr-3">{row.locale}</td>
                  <td className="py-2 pr-3">{row.topic}</td>
                  <td className="py-2 pr-3">{row.evidence}</td>
                  <td className="py-2 pr-3">{row.helpful ? '도움됨' : '아쉬움'}</td>
                  <td className="py-2 font-bold tabular-nums">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {helpful.length === 0 && <p className="py-4 text-[15px] text-ink-500">아직 기록이 없습니다.</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.length === 0 && <p className="text-[15px] text-ink-500">아직 받은 글이 없습니다.</p>}
          {rows.map((row) => (
            <AdminRow key={row.id} row={row} onSave={save} />
          ))}
        </div>
      )}
    </main>
  );
}

function AdminRow({ row, onSave }: { row: Row; onSave: (id: number, patch: Record<string, unknown>) => Promise<void> }) {
  const [answer, setAnswer] = useState(row.answer);
  const [title, setTitle] = useState(row.title);

  return (
    <article className="lr-card p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
        <span className="font-bold text-ink-900">#{row.id}</span>
        <span>{row.created_at.slice(0, 16).replace('T', ' ')}</span>
        <span>{row.locale}</span>
        {row.detail && <span className="rounded-full bg-surface-soft px-2 py-0.5">{JOIN_LABELS[row.detail] ?? row.detail}</span>}
        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
        {row.published && <span className="rounded-full bg-brand-50 px-2 py-0.5 font-semibold text-brand-700">게시판 공개</span>}
      </div>

      <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-900">{row.body}</p>

      {row.contact && (
        <p className="mt-3 text-[15px] text-ink-700">
          답장 받을 곳: <span className="font-semibold">{row.contact}</span>
        </p>
      )}

      {row.kind === 'question' && (
        <div className="mt-4">
          <label className="block text-sm font-semibold text-ink-700" htmlFor={`title-${row.id}`}>
            게시판에 올릴 제목
          </label>
          <input
            id={`title-${row.id}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="lr-input mt-1"
          />
        </div>
      )}

      <div className="mt-3">
        <label className="block text-sm font-semibold text-ink-700" htmlFor={`answer-${row.id}`}>
          답변
        </label>
        <textarea
          id={`answer-${row.id}`}
          value={answer}
          rows={4}
          onChange={(event) => setAnswer(event.target.value)}
          className="lr-input mt-1 resize-y"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onSave(row.id, { answer, title, status: 'answered' })}
          className="lr-btn lr-btn-primary lr-btn-sm"
        >
          답변 저장
        </button>
        {row.kind === 'question' && (
          <button
            type="button"
            onClick={() => void onSave(row.id, { published: !row.published })}
            className="lr-btn lr-btn-ghost lr-btn-sm"
          >
            {row.published ? '게시판에서 내리기' : '게시판에 올리기'}
          </button>
        )}
        <button type="button" onClick={() => void onSave(row.id, { status: 'hidden' })} className="lr-btn lr-btn-ghost lr-btn-sm">
          숨김
        </button>
        <button type="button" onClick={() => void onSave(row.id, { status: 'spam' })} className="lr-btn lr-btn-ghost lr-btn-sm">
          스팸
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`#${row.id} 글을 지웁니다. 되돌릴 수 없습니다.`)) void onSave(row.id, { remove: true });
          }}
          className="lr-btn lr-btn-ghost lr-btn-sm text-[var(--color-danger-700)]"
        >
          지우기
        </button>
      </div>
    </article>
  );
}
