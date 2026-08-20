"use client";

import { PopupNoticeDialog } from "@/components/layout/PopupNoticeModal";
import {
  createEmptyPopupNotice,
  pickActivePopupNotice,
  popupNoticeStatusLabel,
  todayDateString,
  validatePopupNotice,
  validatePopupNoticeImageFile,
  type PopupNotice,
} from "@/data/popup-notices";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { listPopupNotices, removePopupNotice, savePopupNotice } from "@/lib/popup-notices";
import { FormEvent, useEffect, useState } from "react";

export default function AdminPopupNoticesPage() {
  const today = todayDateString();
  const [notices, setNotices] = useState<PopupNotice[]>([]);
  const [form, setForm] = useState<PopupNotice>(createEmptyPopupNotice(today));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [storageToDelete, setStorageToDelete] = useState("");
  const [previewNotice, setPreviewNotice] = useState<PopupNotice | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const reload = async () => {
    setNotices(await listPopupNotices());
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const nextNotices = await listPopupNotices();
        if (!cancelled) {
          setNotices(nextNotices);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(toKoreanFirebaseError(error, "팝업 공지를 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setForm(createEmptyPopupNotice(today));
    setImageFile(null);
    setImagePreviewUrl("");
    setStorageToDelete("");
  };

  const onPickImage = (file: File | undefined) => {
    if (!file) {
      return;
    }
    const fileError = validatePopupNoticeImageFile(file);
    if (fileError) {
      setErrorMessage(fileError);
      return;
    }
    if (form.storagePath) {
      setStorageToDelete(form.storagePath);
    }
    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setErrorMessage("");
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setForm({ ...form, imageUrl: "", storagePath: "" });
  };

  const onRemoveImage = () => {
    if (form.storagePath) {
      setStorageToDelete(form.storagePath);
    }
    if (imagePreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(null);
    setImagePreviewUrl("");
    setForm({ ...form, imageUrl: "", storagePath: "" });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const noticeToSave: PopupNotice = {
      ...form,
      id: form.id.trim() || `popup-${Date.now()}`,
      title: form.title.trim(),
      body: form.body.trim(),
      imageUrl: form.imageUrl.trim() || (imageFile ? "https://pending.local/image" : ""),
    };
    const validationMessage = validatePopupNotice({
      ...noticeToSave,
      imageUrl: noticeToSave.imageUrl,
      storagePath: imageFile ? "" : form.storagePath,
    });
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      await savePopupNotice(
        {
          ...noticeToSave,
          imageUrl: form.imageUrl.trim(),
          storagePath: form.storagePath,
        },
        imageFile,
        storageToDelete,
      );
      await reload();
      resetForm();
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "팝업 공지를 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (noticeId: string) => {
    if (!window.confirm("이 팝업 공지를 삭제할까요?")) {
      return;
    }
    setErrorMessage("");
    try {
      await removePopupNotice(noticeId, notices.find((item) => item.id === noticeId)?.storagePath ?? "");
      setNotices((current) => current.filter((item) => item.id !== noticeId));
      await reload();
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "팝업 공지를 삭제하지 못했습니다."));
    }
  };

  const activeNotice = pickActivePopupNotice(notices, today);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">팝업 공지</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          홈을 열면 가운데 창으로 한 장만 뜹니다. 켜 둔 공지가 여러 개면 <strong className="font-semibold">가장 최근 저장한 것</strong>만
          보입니다. 사진 1장(JPG·PNG·GIF·WEBP, 8MB 이하)을 넣을 수 있고, 본문은 비워도 됩니다. HTML은 쓰지 마세요.
        </p>
      </div>
      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

      <form onSubmit={onSubmit} className="glass-card grid gap-3 rounded-3xl p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            시작일
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              className="h-10 rounded-xl border border-[var(--line)] bg-transparent px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            종료일
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              className="h-10 rounded-xl border border-[var(--line)] bg-transparent px-3"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          제목
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            className="h-10 rounded-xl border border-[var(--line)] bg-transparent px-3"
            placeholder="예: 2학기 오픈수업 안내"
          />
        </label>
        <label className="grid gap-1 text-sm">
          본문
          <textarea
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            className="min-h-32 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            placeholder="학우에게 보여줄 안내. 사진만 올려도 됩니다. 줄바꿈은 그대로 보입니다."
          />
        </label>
        <label className="grid gap-1 text-sm">
          사진
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            onChange={(event) => {
              onPickImage(event.target.files?.[0]);
              event.target.value = "";
            }}
            className="text-sm"
          />
          <span className="text-xs text-[var(--text-muted)]">포스터·안내 이미지 1장. 없어도 본문만으로 저장됩니다.</span>
        </label>
        {imagePreviewUrl || form.imageUrl ? (
          <div className="grid gap-2">
            <img src={imagePreviewUrl || form.imageUrl} alt="팝업 사진 미리보기" className="max-h-64 w-full rounded-2xl object-contain" />
            <button type="button" onClick={onRemoveImage} className="w-fit rounded-full border border-[var(--line)] px-3 py-1 text-sm">
              사진 빼기
            </button>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
          />
          지금 바로 띄우기
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "팝업 저장"}
          </button>
          <button
            type="button"
            onClick={() =>
              setPreviewNotice({
                ...form,
                id: form.id || "preview",
                title: form.title.trim() || "미리보기",
                body: form.body.trim(),
                imageUrl: imagePreviewUrl || form.imageUrl,
              })
            }
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
          >
            미리보기
          </button>
          <button type="button" onClick={resetForm} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            입력칸 비우기
          </button>
        </div>
      </form>

      <article className="glass-card rounded-3xl p-5">
        <h2 className="font-semibold">등록된 팝업 {isLoading ? "" : `(${notices.length})`}</h2>
        {notices.length === 0 && !isLoading ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">아직 올린 팝업 공지가 없습니다.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {notices.map((item) => {
              const status = popupNoticeStatusLabel(item, today);
              const isLive = activeNotice?.id === item.id;
              return (
                <div key={item.id} className="flex h-full flex-col gap-3 rounded-2xl border border-[var(--line)] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isLive ? "bg-cyan-500 text-navy-950" : "border border-[var(--line)] text-[var(--text-muted)]"
                        }`}
                      >
                        {isLive ? "지금 표시" : status}
                      </span>
                      <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                        {item.startDate} ~ {item.endDate}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold tracking-tight break-keep">{item.title}</p>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="mt-2 h-28 w-full rounded-xl object-cover" />
                    ) : null}
                    {item.body ? <p className="mt-1 line-clamp-3 text-sm text-[var(--text-muted)] break-keep">{item.body}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (imagePreviewUrl.startsWith("blob:")) {
                          URL.revokeObjectURL(imagePreviewUrl);
                        }
                        setImageFile(null);
                        setStorageToDelete("");
                        setForm(item);
                        setImagePreviewUrl(item.imageUrl);
                      }}
                      className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
                    >
                      수정
                    </button>
                    <button type="button" onClick={() => setPreviewNotice(item)} className="rounded-full border border-[var(--line)] px-3 py-1 text-sm">
                      미리보기
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(item.id)}
                      className="rounded-full border border-rose-300 px-3 py-1 text-sm text-rose-600 dark:border-rose-500/50 dark:text-rose-300"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>

      {previewNotice ? (
        <PopupNoticeDialog notice={previewNotice} onClose={() => setPreviewNotice(null)} onDismissToday={() => setPreviewNotice(null)} />
      ) : null}
    </div>
  );
}
