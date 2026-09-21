// "자료 추가 요청하기" 메일 주소(mailto:)를 만듭니다.
// 받는 주소는 content/site.json 의 contactEmail 만 쓰며, 비어 있으면 링크를 만들지 않습니다. (주소를 짐작해 넣지 않습니다)
// 메일 제목과 본문은 미리 채워 두지만, 이용자가 메일 앱에서 자유롭게 고쳐서 보냅니다.
// 이용자가 AI에게 쓴 질문 내용은 넣지 않습니다. (개인정보가 섞여 있을 수 있으므로)

export interface MaterialRequestMessages {
  subject: string;
  subjectWithTitle: string;
  mailBody: string;
  mailBodyPage: string;
}

/** title 이 있으면 "보고 있던 권리정보"를 적은 제목·본문으로 만듭니다. */
export function materialRequestHref(email: string | undefined, m: MaterialRequestMessages, title?: string): string {
  if (!email) return '';
  const subject = title ? m.subjectWithTitle.replace('{title}', title) : m.subject;
  const body = title ? m.mailBodyPage.replace('{title}', title) : m.mailBody;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
