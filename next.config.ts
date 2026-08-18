import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 기존 그누보드 이미지는 외부 도메인이므로 미리보기만 허용합니다.
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "bnbstudy.co.kr",
      },
      {
        protocol: "http",
        hostname: "www.bnbstudy.co.kr",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/community/notices", destination: "/community/notice", permanent: false },
      { source: "/community/lounge", destination: "/community/free", permanent: false },
      { source: "/community/qna", destination: "/community/qa", permanent: false },
    ];
  },
};

export default nextConfig;
