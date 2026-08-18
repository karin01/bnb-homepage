import { ResourceBoardView } from "@/components/resources/ResourceBoardView";

/** GitHub Pages 정적 내보내기에서 미리 만들 자료실 방입니다. */
export function generateStaticParams() {
  return [{ room: "1" }, { room: "2" }, { room: "3" }, { room: "4" }, { room: "club" }];
}

export default function ResourceBoardPage() {
  return <ResourceBoardView />;
}
