import { SITE } from "@/data/site";

type KakaoChannelQrProps = {
  /** section: 홈/입회 안내처럼 크게, compact: 푸터처럼 작게 */
  variant?: "section" | "compact";
};

export function KakaoChannelQr({ variant = "section" }: KakaoChannelQrProps) {
  const isCompact = variant === "compact";
  const size = isCompact ? 104 : 176;

  const qrImage = (
    <div className={`shrink-0 bg-white ${isCompact ? "rounded-2xl p-2" : "rounded-3xl p-4"}`}>
      <img
        src={SITE.kakaoChannelQrSrc}
        alt="Bit & Byte 카카오채널 QR 코드"
        width={size}
        height={size}
        className="block"
      />
    </div>
  );

  const actions = (
    <div className={`flex flex-wrap gap-2 ${isCompact ? "mt-2" : "mt-5"}`}>
      <a
        href={SITE.kakaoChannelUrl}
        target="_blank"
        rel="noreferrer"
        className={
          isCompact
            ? "text-cyan-glow"
            : "rounded-full bg-[#FEE500] px-4 py-2 text-sm font-semibold text-navy-950"
        }
      >
        채널 바로가기
      </a>
      <a
        href={SITE.kakaoChatUrl}
        target="_blank"
        rel="noreferrer"
        className={
          isCompact
            ? "text-slate-300 hover:text-cyan-glow"
            : "rounded-full border border-[var(--line)] px-4 py-2 text-sm"
        }
      >
        1:1 상담
      </a>
    </div>
  );

  if (isCompact) {
    return (
      <div className="flex items-start gap-4">
        {qrImage}
        <div className="text-sm leading-6 text-slate-300">
          <p className="font-semibold text-slate-100">카카오채널 QR</p>
          <p className="mt-1 text-slate-400">휴대폰 카메라로 찍으면 채널이 열립니다.</p>
          {actions}
        </div>
      </div>
    );
  }

  return (
    <section id="kakao-channel" className="mx-auto max-w-6xl px-5 pb-20">
      <article className="glass-card grid gap-6 rounded-3xl p-6 md:grid-cols-[auto_1fr] md:items-center md:p-8">
        <div className="justify-self-center">{qrImage}</div>
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-700 uppercase dark:text-cyan-glow">Kakao Channel</p>
          <h2 className="mt-2 text-2xl font-semibold">카메라로 QR을 찍으면 카카오채널이 열립니다</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            오픈수업, 입회, 소모임 문의는 Bit & Byte 카카오채널로 받습니다. 앱이 없는 컴퓨터에서는 아래 버튼으로 같은 채널을 열 수 있습니다.
          </p>
          {actions}
        </div>
      </article>
    </section>
  );
}
