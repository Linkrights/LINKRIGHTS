/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // content 폴더의 JSON 파일들이 배포 서버에도 함께 올라가도록 보장합니다.
  outputFileTracingIncludes: {
    '/**': ['./content/**/*'],
  },
};

export default nextConfig;
