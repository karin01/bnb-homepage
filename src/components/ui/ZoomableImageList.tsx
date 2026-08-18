"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";

type ZoomableImageListProps = {
  images: string[];
  altPrefix: string;
};

/** 글을 읽을 때는 화면에 맞게 보여주고, 클릭하면 잘리지 않은 원본을 띄웁니다. */
export function ZoomableImageList({ images, altPrefix }: ZoomableImageListProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenIndex(null);
        return;
      }
      if (event.key === "ArrowLeft") {
        setOpenIndex((current) => (current === null ? current : (current + images.length - 1) % images.length));
        return;
      }
      if (event.key === "ArrowRight") {
        setOpenIndex((current) => (current === null ? current : (current + 1) % images.length));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [images.length, openIndex]);

  if (images.length === 0) {
    return null;
  }

  const openUrl = openIndex === null ? "" : images[openIndex];

  return (
    <>
      <div className="mb-6 grid gap-3">
        {images.map((imageUrl, index) => (
          <button
            key={`${imageUrl}-${index}`}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="block w-full overflow-hidden rounded-3xl border-0 bg-transparent p-0 text-left"
            aria-label={`${altPrefix} ${index + 1}번째 사진 원본 보기`}
          >
            <img src={imageUrl} alt={`${altPrefix} ${index + 1}번째 사진`} className="w-full cursor-zoom-in rounded-3xl object-cover" />
          </button>
        ))}
      </div>

      {openIndex !== null && openUrl ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="원본 사진 보기"
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute right-4 top-4 z-[81] rounded-full bg-black/60 p-2 text-white"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((openIndex + images.length - 1) % images.length);
                }}
                className="absolute left-4 top-1/2 z-[81] -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
                aria-label="이전 사진"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((openIndex + 1) % images.length);
                }}
                className="absolute right-4 top-1/2 z-[81] -translate-y-1/2 rounded-full bg-black/60 p-2 text-white"
                aria-label="다음 사진"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {openIndex + 1} / {images.length}
              </p>
            </>
          ) : null}

          <div className="flex max-h-[92vh] max-w-[96vw] flex-col items-center gap-3" onClick={(event) => event.stopPropagation()}>
            {/* 화면보다 큰 사진은 맞게 줄이되, 글 목록처럼 잘라 내지 않습니다. */}
            <img
              src={openUrl}
              alt={`${altPrefix} 원본 ${openIndex + 1}번째 사진`}
              className="max-h-[84vh] max-w-[96vw] object-contain"
            />
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-black/60 px-3 py-1 text-xs text-white underline-offset-2 hover:underline"
            >
              새 탭에서 원본 열기
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
