import { CopyAddressButton } from "@/components/ui/CopyAddressButton";
import { SITE, getKakaoMapUrl, getKakaoRouteUrl, getOsmEmbedUrl } from "@/data/site";
import Link from "next/link";

export function DirectionsSection() {
  const kakaoMapUrl = getKakaoMapUrl();
  const kakaoRouteUrl = getKakaoRouteUrl();

  return (
    <section id="directions" className="mx-auto max-w-6xl px-5 pb-20">
      <article className="glass-card overflow-hidden rounded-3xl">
        <div className="p-6 md:p-8">
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-700 uppercase dark:text-cyan-glow">How to find us</p>
          <h2 className="mt-3 text-2xl font-semibold">오시는 길</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{SITE.locationDetail}.</p>
        </div>

        <div className="border-t border-[var(--line)]">
          <iframe
            title={`${SITE.map.placeName} 위치 지도`}
            src={getOsmEmbedUrl()}
            className="h-72 w-full border-0 bg-[var(--bg)] md:h-96"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="flex flex-wrap gap-2 border-t border-[var(--line)] px-5 py-3">
            <a
              href={kakaoMapUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-navy-950"
            >
              카카오맵 크게보기
            </a>
            <a
              href={kakaoRouteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
            >
              길찾기
            </a>
          </div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div>
            <p className="text-sm font-semibold">주소</p>
            <p className="mt-2 text-base font-semibold leading-7">{SITE.address}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              지번 {SITE.jibunAddress} · 우편번호 {SITE.postalCode}
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">{SITE.directions.walking}</p>
            <div className="mt-4">
              <CopyAddressButton address={SITE.address} />
            </div>
          </div>

          <div className="grid gap-5">
            <div>
              <p className="text-sm font-semibold">지하철 이용 안내</p>
              <ul className="mt-3 grid gap-3">
                {SITE.directions.subway.map((item) => (
                  <li key={item.line} className="rounded-2xl border border-[var(--line)] px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: item.color }}
                      >
                        {item.line}
                      </span>
                      {item.name} 이용 시
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{item.text}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold">버스 이용 안내</p>
              <ul className="mt-3 grid gap-3">
                {SITE.directions.buses.map((item) => (
                  <li key={item.type} className="rounded-2xl border border-[var(--line)] px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
                          item.tone === "blue" ? "bg-blue-600" : "bg-green-600"
                        }`}
                      >
                        {item.type}
                      </span>
                      {item.stop} 정류장
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{item.routes}번 하차</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-[var(--line)] px-6 py-5 md:px-8">
          <Link href="/join/apply" className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-navy-950">
            입회하고 아지트 합류하기
          </Link>
          <a
            href={SITE.kakaoChatUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--line)] px-5 py-2 text-sm"
          >
            길 물어보기
          </a>
        </div>
      </article>
    </section>
  );
}
