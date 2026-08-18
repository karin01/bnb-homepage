/** GitHub Pages는 /bnb-homepage 아래에 열립니다. 로컬은 빈 값입니다. */
export const SITE_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_BASE_PATH}${normalized}`;
}
