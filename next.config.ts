import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const githubPagesBasePath = "/bnb-homepage";

const nextConfig: NextConfig = {
  // GitHub Pages는 Node 서버가 없어서 정적 HTML로 내보냅니다.
  ...(isGithubPages
    ? {
        output: "export" as const,
        basePath: githubPagesBasePath,
        assetPrefix: githubPagesBasePath,
        trailingSlash: true,
      }
    : {}),
  images: {
    unoptimized: true,
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
  // 정적 내보내기는 redirects를 지원하지 않습니다. 예전 주소는 게시판 화면에서 옮깁니다.
  ...(!isGithubPages
    ? {
        async redirects() {
          return [
            { source: "/community/notices", destination: "/community/notice", permanent: false },
            { source: "/community/lounge", destination: "/community/free", permanent: false },
            { source: "/community/qna", destination: "/community/qa", permanent: false },
          ];
        },
      }
    : {}),
};

export default nextConfig;
