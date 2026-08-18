import { CommunityBoardRoute } from "@/components/community/CommunityBoardRoute";
import { DEFAULT_BOARDS } from "@/data/boards";

/** GitHub Pages 정적 내보내기에서 미리 만들 게시판 주소입니다. */
export function generateStaticParams() {
  return [
    ...DEFAULT_BOARDS.map((board) => ({ slug: board.id })),
    { slug: "notices" },
    { slug: "lounge" },
    { slug: "qna" },
  ];
}

export default function CommunityBoardPage() {
  return <CommunityBoardRoute />;
}
