// 운영팀 관리자 페이지입니다. (/admin)
//
// 이용자가 사이트에서 보낸 질문·참여 문의·정보 수정 제보를 여기에서 읽고 답합니다.
// 화면을 그리는 일은 모두 브라우저에서 하고(AdminClient), 실제 자료는 로그인한 뒤에만 /api/admin/data 에서 받아옵니다.
//
// 준비물 (Vercel 프로젝트 설정 > Environment Variables)
//   DATABASE_URL    : Vercel 마켓플레이스에서 Neon Postgres 를 연결하면 자동으로 들어옵니다.
//   ADMIN_PASSWORD  : 관리자 비밀번호 (8자 이상). 팀이 직접 정하고 언제든 바꿀 수 있습니다.
// 둘 중 하나라도 없으면 화면에서 무엇이 빠졌는지 알려줍니다.

import { AdminClient } from '@/components/AdminClient';
import { hasAdmin } from '@/lib/adminAuth';
import { hasDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return <AdminClient ready={{ admin: hasAdmin(), db: hasDb() }} />;
}
