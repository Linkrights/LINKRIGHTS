// 주소를 잘못 입력했을 때 보이는 화면입니다.
import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Segoe UI", sans-serif',
          background: '#f5f8fd',
          color: '#101828',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1f4fc4', margin: 0 }}>LINKRIGHTS</p>
          <h1 style={{ fontSize: 24, margin: '12px 0 8px' }}>페이지를 찾을 수 없습니다</h1>
          <p style={{ color: '#667085', margin: '0 0 20px', lineHeight: 1.6 }}>
            주소가 바뀌었거나 삭제된 페이지입니다.
            <br />
            Page not found.
          </p>
          <Link
            href="/ko"
            style={{
              display: 'inline-block',
              background: '#1f4fc4',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: 12,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            처음으로 / Go home
          </Link>
        </div>
      </body>
    </html>
  );
}
