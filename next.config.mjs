/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // content 폴더의 JSON 파일들이 배포 서버에도 함께 올라가도록 보장합니다.
  outputFileTracingIncludes: {
    '/**': ['./content/**/*'],
  },
  // 글꼴 파일은 한 번 받으면 오래 보관하게 합니다. (데이터가 적은 이용자를 위해 다시 내려받지 않도록)
  // 주의: 글꼴 내용을 바꿀 때는 파일 이름도 함께 바꿔야 새 파일이 전달됩니다.
  async headers() {
    return [
      {
        source: '/fonts/:file*.woff2',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
