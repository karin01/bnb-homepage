"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import { PageHero } from "@/components/ui/PageHero";
import {
  boardPostPath,
  boardPublicPath,
  canWriteOnBoard,
  createGuestAuthorId,
  maxImagesForSkin,
  validateGuestDisplayName,
  type BoardConfig,
  type BoardPost,
} from "@/data/boards";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { readBoard } from "@/lib/boards";
import { readPost, savePost, validateGalleryImageFile, validateGalleryUrl, validatePostInput, type GalleryDraftImage } from "@/lib/posts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type EditorImage = GalleryDraftImage & { key: string; previewUrl?: string };

function createImageKey() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PostEditor({ boardId, postId }: { boardId: string; postId?: string }) {
  const router = useRouter();
  const { uid, memberName, role, isAdmin } = useMembership();
  const [board, setBoard] = useState<BoardConfig | null>(null);
  const [existing, setExisting] = useState<BoardPost | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<EditorImage[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [isNotice, setIsNotice] = useState(false);
  const [guestDisplayName, setGuestDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const nextBoard = await readBoard(boardId);
        setBoard(nextBoard);
        if (postId) {
          const nextPost = await readPost(postId);
          setExisting(nextPost);
          if (nextPost) {
            setTitle(nextPost.title);
            setBody(nextPost.body);
            setIsNotice(nextPost.isNotice);
            setImages(
              nextPost.images.slice(0, nextBoard ? maxImagesForSkin(nextBoard.skin) : nextPost.images.length).map((image) => ({
                key: createImageKey(),
                imageUrl: image.imageUrl,
                storagePath: image.storagePath,
                file: null,
              })),
            );
          }
        }
      } catch (error) {
        setErrorMessage(toKoreanFirebaseError(error, "글을 불러오지 못했습니다."));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [boardId, postId]);

  useEffect(() => {
    previewUrlsRef.current = images.map((image) => image.previewUrl).filter((url): url is string => Boolean(url));
  }, [images]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const hasAuthAccount = Boolean(uid);
  const canWrite = board ? canWriteOnBoard(role, board.writeRole, isAdmin, Boolean(uid)) : false;
  const canEditExisting = existing ? isAdmin || (hasAuthAccount && existing.authorUid === uid) : true;
  const allowFileUpload = hasAuthAccount;
  const maxImages = board ? maxImagesForSkin(board.skin) : 1;
  const remainingSlots = maxImages - images.length;
  const isGallery = board?.skin === "gallery";

  const onPickFiles = (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    if (remainingSlots <= 0) {
      setErrorMessage(maxImages === 1 ? "이 게시판에는 사진을 1장만 올릴 수 있습니다." : `사진은 글당 ${maxImages}장까지 올릴 수 있습니다.`);
      return;
    }

    const accepted: EditorImage[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      const fileError = validateGalleryImageFile(file);
      if (fileError) {
        setErrorMessage(fileError);
        return;
      }
      accepted.push({
        key: createImageKey(),
        imageUrl: "",
        storagePath: "",
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setErrorMessage("");
    setImages((current) => [...current, ...accepted]);
    if (files.length > remainingSlots) {
      setErrorMessage(maxImages === 1 ? "이 게시판에는 사진을 1장만 올릴 수 있습니다." : `사진은 글당 ${maxImages}장까지라, 앞의 ${remainingSlots}장만 담았습니다.`);
    }
  };

  const onAddUrl = () => {
    const urlError = validateGalleryUrl(urlInput);
    if (urlError) {
      setErrorMessage(urlError);
      return;
    }
    if (remainingSlots <= 0) {
      setErrorMessage(maxImages === 1 ? "이 게시판에는 사진을 1장만 올릴 수 있습니다." : `사진은 글당 ${maxImages}장까지 올릴 수 있습니다.`);
      return;
    }
    setErrorMessage("");
    setImages((current) => [
      ...current,
      {
        key: createImageKey(),
        imageUrl: urlInput.trim(),
        storagePath: "",
        file: null,
      },
    ]);
    setUrlInput("");
  };

  const onRemoveImage = (key: string) => {
    setImages((current) => {
      const target = current.find((image) => image.key === key);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((image) => image.key !== key);
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validatePostInput({
      boardId,
      title,
      body,
      images,
      maxImages,
    });
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    let authorUid = uid;
    let authorName = memberName;
    if (!hasAuthAccount) {
      const guestNameError = validateGuestDisplayName(guestDisplayName);
      if (guestNameError) {
        setErrorMessage(guestNameError);
        return;
      }
      if (images.some((image) => Boolean(image.file))) {
        setErrorMessage("비가입자는 파일을 올릴 수 없습니다. 공개 이미지 주소만 넣어 주세요.");
        return;
      }
      authorUid = createGuestAuthorId();
      authorName = guestDisplayName.trim();
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      const savedId = await savePost({
        id: existing?.id,
        boardId,
        title,
        body,
        images,
        maxImages,
        isNotice: isAdmin ? isNotice : false,
        authorUid,
        authorName,
      });
      router.push(boardPostPath(boardId, savedId));
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "글을 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="px-5 py-16 text-sm text-[var(--text-muted)]">편집 화면을 준비하는 중입니다.</p>;
  }

  if (!board) {
    return <p className="px-5 py-16 text-sm text-[var(--text-muted)]">없는 게시판입니다.</p>;
  }

  if (!canWrite || !canEditExisting) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-sm text-[var(--text-muted)]">
          {!canEditExisting
            ? "이 글은 작성자나 운영진만 수정할 수 있습니다. 비가입자가 남긴 글은 운영진이 삭제합니다."
            : "이 게시판에 글을 쓸 권한이 없습니다. 로그인한 뒤 다시 시도해 주세요."}
        </p>
        {!canWrite ? (
          <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
            로그인하기
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <>
      <PageHero eyebrow={board.group} title={existing ? "글 수정" : `${board.title} 글쓰기`} description={board.description} />
      <section className="mx-auto max-w-3xl px-5 py-16">
        <form onSubmit={onSubmit} className="glass-card grid gap-4 rounded-3xl p-6">
          {!hasAuthAccount ? (
            <label className="grid gap-1 text-sm">
              표시 이름
              <input
                value={guestDisplayName}
                onChange={(event) => setGuestDisplayName(event.target.value)}
                className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                placeholder="예: 26학번 김OO"
                maxLength={20}
              />
              <span className="text-xs text-[var(--text-muted)]">
                로그인하지 않아도 글을 남길 수 있습니다. 나중에 수정·삭제는 운영진에게 요청해 주세요.
              </span>
            </label>
          ) : null}
          <label className="grid gap-1 text-sm">
            제목
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            본문
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </label>
          <div className="grid gap-3">
              {allowFileUpload ? (
              <label className="grid gap-1 text-sm">
                사진 올리기 ({images.length}/{maxImages})
                <input
                  type="file"
                  multiple={isGallery}
                  disabled={remainingSlots <= 0}
                  accept="image/png,image/jpeg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={(event) => {
                    onPickFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                  className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 file:mr-3 file:rounded-full file:border-0 file:bg-cyan-500 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-navy-950 disabled:opacity-50"
                />
                <span className="text-xs text-[var(--text-muted)]">
                  {isGallery
                    ? `JPG, PNG, GIF, WEBP / 장당 8MB 이하. 한 번에 여러 장을 고를 수 있고, 글당 ${maxImages}장까지입니다.`
                    : "JPG, PNG, GIF, WEBP / 8MB 이하. 이 게시판에는 사진을 1장만 올릴 수 있습니다."}
                </span>
              </label>
              ) : null}
              {images.length > 0 ? (
                <div className={isGallery ? "grid grid-cols-2 gap-3 md:grid-cols-5" : "grid max-w-xs gap-3"}>
                  {images.map((image, index) => {
                    const previewSrc = image.previewUrl || image.imageUrl;
                    return (
                      <div key={image.key} className="relative overflow-hidden rounded-2xl border border-[var(--line)]">
                        {previewSrc ? (
                          <img src={previewSrc} alt={`${index + 1}번째 사진 미리보기`} className="h-28 w-full object-cover" />
                        ) : (
                          <div className="h-28 bg-gradient-to-br from-cyan-700 to-navy-900" />
                        )}
                        {isGallery ? (
                          <p className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">{index + 1}</p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onRemoveImage(image.key)}
                          className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white"
                        >
                          삭제
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <label className="grid gap-1 text-sm">
                {allowFileUpload ? "또는 이미지 주소" : "이미지 주소"} {isGallery ? "추가" : "(선택)"}
                <div className="flex gap-2">
                  <input
                    value={urlInput}
                    onChange={(event) => setUrlInput(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
                    placeholder="https://"
                    disabled={remainingSlots <= 0}
                  />
                  <button
                    type="button"
                    onClick={onAddUrl}
                    disabled={remainingSlots <= 0}
                    className="rounded-full border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {allowFileUpload
                    ? isGallery
                      ? "공개된 사진 주소가 있으면 한 장씩 붙여 넣을 수 있습니다."
                      : "공개된 사진 주소가 있으면 붙여 넣은 뒤 추가를 누르면 됩니다."
                    : "비가입자는 파일을 올리지 못하고, 공개된 사진 주소만 붙일 수 있습니다."}
                </span>
              </label>
            </div>
          {isAdmin ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isNotice} onChange={(event) => setIsNotice(event.target.checked)} />
              공지로 고정
            </label>
          ) : null}
          {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
          <div className="flex gap-2">
            <button type="submit" disabled={isSaving} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60">
              {isSaving ? "저장 중..." : "저장"}
            </button>
            <Link href={boardPublicPath(boardId)} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
              취소
            </Link>
          </div>
        </form>
      </section>
    </>
  );
}
