"use client";

import { useMembership } from "@/components/providers/MembershipProvider";
import {
  DEFAULT_GUEST_ACCESS_SETTINGS,
  countryLabel,
  isPrivateOrLocalIp,
  validateBlockedIpInput,
  validateGuestAccessSettings,
  type BlockedIpRecord,
  type GuestAccessSettings,
} from "@/data/security";
import { getFirebaseAuth } from "@/lib/firebase";
import { toKoreanFirebaseError } from "@/lib/firebase-errors";
import { withBasePath } from "@/lib/site-path";
import {
  ensureGuestAccessSettings,
  listBlockedIps,
  removeBlockedIp,
  saveBlockedIp,
  saveGuestAccessSettings,
} from "@/lib/security-settings";
import { FormEvent, useEffect, useState } from "react";

type RuntimeTempBlock = {
  ip: string;
  reason: string;
  until: number;
  countryCode: string;
};

type RuntimeEvent = {
  ip: string;
  countryCode: string;
  action: string;
  allowed: boolean;
  at: number;
  message: string;
};

async function readAdminToken() {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }
  return user.getIdToken();
}

function formatWhen(value: string | number) {
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function AdminSecurityPage() {
  const { memberName } = useMembership();
  const [settings, setSettings] = useState<GuestAccessSettings>(DEFAULT_GUEST_ACCESS_SETTINGS);
  const [countryInput, setCountryInput] = useState("KR");
  const [blockedIps, setBlockedIps] = useState<BlockedIpRecord[]>([]);
  const [tempBlocks, setTempBlocks] = useState<RuntimeTempBlock[]>([]);
  const [recent, setRecent] = useState<RuntimeEvent[]>([]);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadAll = async () => {
    const nextSettings = await ensureGuestAccessSettings();
    setSettings(nextSettings);
    setCountryInput(nextSettings.allowedCountryCodes.join(", "));
    setBlockedIps(await listBlockedIps());

    const token = await readAdminToken();
    const response = await fetch(withBasePath("/api/security/runtime-blocks"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json()) as {
      message?: string;
      tempBlocks?: RuntimeTempBlock[];
      recent?: RuntimeEvent[];
    };
    if (!response.ok) {
      throw new Error(payload.message || "접속 기록을 불러오지 못했습니다.");
    }
    setTempBlocks(payload.tempBlocks ?? []);
    setRecent(payload.recent ?? []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadAll();
      } catch (error) {
        setErrorMessage(toKoreanFirebaseError(error, "보안 설정을 불러오지 못했습니다."));
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, []);

  const onSaveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSettings: GuestAccessSettings = {
      ...settings,
      allowedCountryCodes: countryInput
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    };
    const validationMessage = validateGuestAccessSettings(nextSettings);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      const saved = await saveGuestAccessSettings(nextSettings);
      setSettings(saved);
      setCountryInput(saved.allowedCountryCodes.join(", "));
      setInfoMessage("보안 설정을 저장했습니다.");
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "설정을 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onAddIp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validateBlockedIpInput(newIp, newReason);
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    setInfoMessage("");
    try {
      await saveBlockedIp({ ip: newIp, reason: newReason, createdByName: memberName || "운영진" });
      setNewIp("");
      setNewReason("");
      setBlockedIps(await listBlockedIps());
      setInfoMessage("IP를 차단 목록에 넣었습니다.");
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "IP를 차단하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  };

  const onRemovePermanent = async (id: string) => {
    if (!window.confirm("이 IP 차단을 해제할까요?")) {
      return;
    }
    try {
      await removeBlockedIp(id);
      setBlockedIps((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "차단을 해제하지 못했습니다."));
    }
  };

  const onPromoteTemp = async (ip: string, reason: string) => {
    try {
      await saveBlockedIp({ ip, reason: reason || "도배 자동 차단을 영구 차단으로 옮김", createdByName: memberName || "운영진" });
      const token = await readAdminToken();
      await fetch(withBasePath("/api/security/runtime-blocks"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip }),
      });
      await loadAll();
      setInfoMessage(`${ip}을 영구 차단 목록으로 옮겼습니다.`);
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "영구 차단으로 옮기지 못했습니다."));
    }
  };

  const onRemoveTemp = async (ip: string) => {
    try {
      const token = await readAdminToken();
      const response = await fetch(withBasePath("/api/security/runtime-blocks"), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || "임시 차단을 해제하지 못했습니다.");
      }
      setTempBlocks((current) => current.filter((item) => item.ip !== ip));
    } catch (error) {
      setErrorMessage(toKoreanFirebaseError(error, "임시 차단을 해제하지 못했습니다."));
    }
  };

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">접속 보안</h1>
        <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
          신편입생 게시판처럼 로그인 없이 글을 받는 곳에서, 해외 IP와 도배 접속을 막습니다. IP는 개인정보에 가깝기 때문에 공개 글에는 남기지 않고, 이 화면에서만 봅니다.
        </p>
      </div>

      {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
      {infoMessage ? <p className="text-sm text-cyan-700 dark:text-cyan-glow">{infoMessage}</p> : null}
      {isLoading ? <p className="text-sm text-[var(--text-muted)]">보안 설정을 불러오는 중입니다.</p> : null}

      <form onSubmit={onSaveSettings} className="glass-card grid gap-4 rounded-3xl p-5 md:grid-cols-2">
        <p className="md:col-span-2 font-medium">기본 정책</p>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={settings.blockOverseas}
            onChange={(event) => setSettings({ ...settings, blockOverseas: event.target.checked })}
          />
          해외 IP에서 비가입자 글·댓글 막기
        </label>
        <label className="grid gap-1 text-sm md:col-span-2">
          허용 국가 코드
          <input
            value={countryInput}
            onChange={(event) => setCountryInput(event.target.value)}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
            placeholder="KR"
          />
          <span className="text-xs text-[var(--text-muted)]">쉼표로 여러 나라를 넣을 수 있습니다. 기본은 KR(대한민국)만 허용합니다.</span>
        </label>
        <label className="grid gap-1 text-sm">
          같은 IP, 1시간 글 수
          <input
            type="number"
            min={1}
            max={60}
            value={settings.maxGuestPostsPerHour}
            onChange={(event) => setSettings({ ...settings, maxGuestPostsPerHour: Number(event.target.value) })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          같은 IP, 1시간 댓글 수
          <input
            type="number"
            min={1}
            max={120}
            value={settings.maxGuestCommentsPerHour}
            onChange={(event) => setSettings({ ...settings, maxGuestCommentsPerHour: Number(event.target.value) })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          도배로 볼 횟수
          <input
            type="number"
            min={3}
            max={50}
            value={settings.floodCount}
            onChange={(event) => setSettings({ ...settings, floodCount: Number(event.target.value) })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          도배 감시 시간(분)
          <input
            type="number"
            min={1}
            max={180}
            value={settings.floodWindowMinutes}
            onChange={(event) => setSettings({ ...settings, floodWindowMinutes: Number(event.target.value) })}
            className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2"
          />
        </label>
        <p className="md:col-span-2 text-xs text-[var(--text-muted)]">
          도배 기준을 넘기면 그 IP는 하루 동안 임시 차단됩니다. 필요하면 아래 목록에서 영구 차단으로 옮기면 됩니다.
        </p>
        <button type="submit" disabled={isSaving} className="w-fit rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60">
          {isSaving ? "저장 중..." : "정책 저장"}
        </button>
      </form>

      <form onSubmit={onAddIp} className="glass-card grid gap-3 rounded-3xl p-5 md:grid-cols-[1fr_1fr_auto]">
        <p className="md:col-span-3 font-medium">IP 직접 차단</p>
        <input
          value={newIp}
          onChange={(event) => setNewIp(event.target.value)}
          className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
          placeholder="203.0.113.10"
        />
        <input
          value={newReason}
          onChange={(event) => setNewReason(event.target.value)}
          className="rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-sm"
          placeholder="차단 이유 (선택)"
        />
        <button type="submit" disabled={isSaving} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950 disabled:opacity-60">
          차단 추가
        </button>
      </form>

      <section className="glass-card rounded-3xl p-5">
        <h2 className="font-medium">영구 차단 {blockedIps.length}개</h2>
        {blockedIps.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">아직 직접 막아 둔 IP가 없습니다.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {blockedIps.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--line)] px-4 py-3 text-sm">
                <div>
                  <p className="font-mono">{item.ip}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {item.reason || "이유 없음"} · {item.createdByName} · {formatWhen(item.createdAt)}
                  </p>
                </div>
                <button type="button" onClick={() => void onRemovePermanent(item.id)} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
                  해제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card rounded-3xl p-5">
        <h2 className="font-medium">자동 임시 차단 {tempBlocks.length}개</h2>
        {tempBlocks.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">지금은 도배로 임시 차단된 IP가 없습니다.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {tempBlocks.map((item) => (
              <li key={item.ip} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--line)] px-4 py-3 text-sm">
                <div>
                  <p className="font-mono">{item.ip}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {countryLabel(item.countryCode)} · {item.reason} · {formatWhen(item.until)}까지
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void onPromoteTemp(item.ip, item.reason)} className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-navy-950">
                    영구 차단
                  </button>
                  <button type="button" onClick={() => void onRemoveTemp(item.ip)} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs">
                    해제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card rounded-3xl p-5">
        <h2 className="font-medium">최근 비가입자 접속</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">이상한 글이 올라오면 여기서 IP를 보고 바로 막을 수 있습니다.</p>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">아직 기록이 없습니다. 비가입자가 글을 남기면 여기에 쌓입니다.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs text-[var(--text-muted)]">
                <tr>
                  <th className="px-2 py-2">시각</th>
                  <th className="px-2 py-2">IP</th>
                  <th className="px-2 py-2">국가</th>
                  <th className="px-2 py-2">종류</th>
                  <th className="px-2 py-2">결과</th>
                  <th className="px-2 py-2">관리</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item, index) => (
                  <tr key={`${item.at}-${item.ip}-${index}`} className="border-t border-[var(--line)]">
                    <td className="px-2 py-2 whitespace-nowrap">{formatWhen(item.at)}</td>
                    <td className="px-2 py-2 font-mono">{item.ip}</td>
                    <td className="px-2 py-2">{countryLabel(item.countryCode)}</td>
                    <td className="px-2 py-2">{item.action === "comment" ? "댓글" : "글"}</td>
                    <td className="px-2 py-2">
                      {item.allowed ? "허용" : item.message}
                    </td>
                    <td className="px-2 py-2">
                      {isPrivateOrLocalIp(item.ip) ? (
                        <span className="text-xs text-[var(--text-muted)]">내부망</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNewIp(item.ip);
                            setNewReason(item.allowed ? "최근 접속에서 선택" : item.message);
                          }}
                          className="rounded-full border border-[var(--line)] px-3 py-1 text-xs"
                        >
                          이 IP 채우기
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
