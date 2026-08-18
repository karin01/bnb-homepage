import { SITE } from "@/data/site";
import Link from "next/link";

export function RoomPreview() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20">
      <div className="glass-card overflow-hidden rounded-3xl md:grid md:grid-cols-2">
        <div className="bg-linear-to-br from-navy-800 to-cyan-900 p-8 text-white md:min-h-72">
          <p className="font-mono text-xs tracking-[0.2em] text-cyan-glow">OUR PLACE</p>
          <h2 className="mt-3 text-2xl font-semibold">혜화동 아지트 & 오시는 길</h2>
          <p className="mt-4 text-sm leading-7 text-slate-200">
            {SITE.address}. {SITE.locationDetail}. 대여 공간이 아니라, 학우들이 매주 모여 강의하고 수다 떠는 Bit & Byte의 집입니다.
          </p>
        </div>
        <div className="p-8">
          <ul className="grid gap-3 text-sm leading-7">
            <li>예약 없이, 스터디 일정에 맞춰 회원이 모이는 아지트입니다.</li>
            <li>서울지역대학 도서관과 가까워 수업 전후 자료 찾기가 편합니다.</li>
            <li>빔프로젝터, 실습 PC, NAS는 우리 강의와 실습을 위해 갖춘 것들입니다.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/about/room" className="text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
              아지트 둘러보기
            </Link>
            <Link href="/about/room#directions" className="text-sm font-semibold text-cyan-700 dark:text-cyan-glow">
              오시는 길
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
