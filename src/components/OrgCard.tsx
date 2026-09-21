// 도움받을 수 있는 기관 한 곳을 보여주는 카드입니다. (모양은 OrgCardView.tsx)
// 여기에 보이는 이름·설명·운영시간·주소·전화번호·홈페이지는 모두 content/organizations*.json 에서만 가져옵니다.
// (AI가 만들어낸 값은 절대 여기에 들어오지 않습니다. 확인되지 않은 항목은 비워 두면 화면에 나타나지 않습니다)
// 이 부품은 화면 언어의 문구를 직접 불러와 OrgCardView 에 넘깁니다.

import { getMessages, type Locale } from '@/lib/i18n';
import type { Organization } from '@/lib/types';
import { OrgCardView } from './OrgCardView';

export function OrgCard({ org, locale, compact = false }: { org: Organization; locale: Locale; compact?: boolean }) {
  return <OrgCardView org={org} locale={locale} compact={compact} t={getMessages(locale)} />;
}