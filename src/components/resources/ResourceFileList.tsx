"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import { formatFileSize, type ResourceItem } from "@/data/resources";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { useResources } from "@/hooks/useResources";
import { getResourceDownloadUrl } from "@/lib/resources";
import Link from "next/link";
import { useMemo, useState } from "react";

type ResourceFileListProps = {
  grade: "all" | 1 | 2 | 3 | 4;
};

/** 한 학년 자료실, 또는 자료실 허브의 전체 목록을 보여 줍니다. */
export function ResourceFileList({ grade }: ResourceFileListProps) {
  const { membership } = useMembership();
  const { resources, isLoading, errorMessage } = useResources();
  const [keyword, setKeyword] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");

  const filtered = useMemo(
    () =>
      resources.filter((item) => {
        const matchesGrade = grade === "all" || item.grade === grade;
        const haystack = `${item.title} ${item.subject} ${item.kind}`.toLowerCase();
        return matchesGrade && haystack.includes(keyword.trim().toLowerCase());
      }),
    [grade, keyword, resources],
  );

  const gradeCount = grade === "all" ? resources.length : resources.filter((item) => item.grade === grade).length;

  const onDownload = async (item: ResourceItem) => {
    setDownloadMessage("");
    try {
      const url = await getResourceDownloadUrl(item.storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setDownloadMessage(toKoreanFirebaseError(error, "파일을 받지 못했습니다. 로그인 상태를 확인해 주세요."));
    }
  };

  return (
    <div>
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="과목, 제목, 자료 유형 검색"
          className="flex-1 rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm"
        />
        <p className="text-sm text-[var(--text-muted)]">
          {isLoading ? "자료를 불러오는 중..." : `${filtered.length}개 / 전체 ${gradeCount}개`}
        </p>
      </div>
      {errorMessage ? <p className="mt-4 text-sm text-red-500">{errorMessage}</p> : null}
      {downloadMessage ? <p className="mt-4 text-sm text-red-500">{downloadMessage}</p> : null}
      <div className="mt-6 grid gap-3">
        {!isLoading && filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {gradeCount === 0
              ? "아직 올라온 자료가 없습니다. 운영진이 올리면 이 화면에 나타납니다."
              : "조건에 맞는 자료가 없습니다."}
          </p>
        ) : (
          filtered.map((item) => (
            <article key={item.id} className="glass-card flex flex-col gap-2 rounded-2xl p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs text-cyan-700 dark:text-cyan-glow">
                  {item.grade}학년 · {item.year}-{item.semester} · {item.kind} · {item.subject}
                </p>
                <h2 className="mt-1 font-medium">{item.title}</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {item.date} · {item.fileName} · {formatFileSize(item.fileSize)}
                </p>
              </div>
              {membership === "member" ? (
                <button
                  type="button"
                  onClick={() => void onDownload(item)}
                  className="text-sm font-medium text-cyan-700 dark:text-cyan-glow"
                >
                  다운로드
                </button>
              ) : (
                <Link href="/login" className="text-sm font-medium text-cyan-700 dark:text-cyan-glow">
                  회원 로그인 후 열람
                </Link>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
