import { freshmanCohortForYear } from "@/data/cohort";

/** 사이트 전역 상수 — 나중에 CMS/Supabase로 교체하기 쉬운 형태로 모읍니다. */
export const SITE = {
  name: "Bit & Byte",
  shortName: "BnB",
  slogan: "하나의 Bit가 모여 더 큰 Byte를 만든다",
  description:
    "한국방송통신대학교 컴퓨터과학과 No.1 스터디그룹 Bit & Byte. 전공 학습, 학년별 자료실, 소모임, 혜화동 아지트를 한곳에서 안내합니다.",
  establishedYear: 1990,
  currentCohort: freshmanCohortForYear(), // 올해 1학년 기수. 계산은 src/data/cohort.ts
  semesterLabel: "2026학년도 2학기",
  locationLabel: "서울 종로구 혜화동",
  locationDetail: "서울지역대학에서 도보 약 9분, 혜화동 BnB 아지트",
  address: "서울특별시 종로구 율곡로16길 5(이화동) 2층",
  jibunAddress: "서울특별시 종로구 이화동 113",
  postalCode: "03123",
  map: {
    placeName: "이화 비트앤바이트 스터디",
    latitude: 37.575809,
    longitude: 127.003555,
    kakaoPlaceId: "1064234396",
  },
  directions: {
    walking:
      "이화사거리에서 동대문 방향으로 50m, 명동칼국수 삼겹살집과 만물자전거 총판매장 사이 골목으로 들어오시면 주차장 바로 앞 건물 2층입니다. ‘풀밭 동인회’ 간판이 먼저 보입니다.",
    subway: [
      {
        line: "1",
        name: "1호선",
        color: "#0052A4",
        text: "종로5가역 3번 출구로 하차하여 이화사거리로 오신 뒤, 위 골목 안내를 따르면 됩니다.",
      },
      {
        line: "4",
        name: "4호선",
        color: "#00A5DE",
        text: "혜화역 2번 출구로 하차하여 이화사거리로 오신 뒤, 위 골목 안내를 따르면 됩니다.",
      },
    ],
    buses: [
      { type: "간선", tone: "blue", stop: "이화동(이화장)", routes: "102, 107, 108(TS아파트), 301, N16" },
      { type: "지선", tone: "green", stop: "이화동(이화장)", routes: "7025" },
    ],
  },
  kakaoChannelUrl: "https://pf.kakao.com/_exoxhBX",
  kakaoChatUrl: "https://pf.kakao.com/_exoxhBX/chat",
  /** public 폴더 기준 경로. GitHub Pages에서는 withBasePath로 /bnb-homepage를 붙입니다. */
  kakaoChannelQrSrc: "/images/kakao-channel-qr.png",
  googleFormUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSe7e60br0OGZOX532hXDDcS1VO6-gJWIKv2tD-G2otvVE-qng/viewform",
  googleFormEmbedUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSe7e60br0OGZOX532hXDDcS1VO6-gJWIKv2tD-G2otvVE-qng/viewform?embedded=true",
  legacySiteUrl: "http://bnbstudy.co.kr/",
  bank: {
    bankName: "카카오뱅크",
    accountNumber: "3333-38-0133113",
    holder: "손진호",
  },
  fee: {
    semester: 160000,
    year: 300000,
    join: 30000,
  },
} as const;

/** 푸터 스터디 내부 바로가기 */
export const FOOTER_STUDY_LINKS = [
  { label: "스터디 소개", href: "/about" },
  { label: "회칙", href: "/about/rules" },
  { label: "학습일정", href: "/academics/schedule" },
  { label: "자료실", href: "/academics/resources" },
  { label: "소모임", href: "/labs" },
  { label: "신편입생 게시판", href: "/community/qa" },
  { label: "홈페이지 가입", href: "/signup" },
  { label: "입회 안내", href: "/join" },
] as const;

/** 푸터 학교·학과 외부 바로가기. 새 탭에서 엽니다. */
export const FOOTER_UNIVERSITY_LINKS = [
  { label: "방송대 홈페이지", href: "https://www.knou.ac.kr/" },
  { label: "컴퓨터과학과", href: "https://cs.knou.ac.kr/cs1/index.do" },
  { label: "개인학사정보", href: "https://ep.knou.ac.kr/main.do" },
  { label: "서울지역대학", href: "https://seoul.knou.ac.kr/" },
  { label: "중앙도서관", href: "https://library.knou.ac.kr/" },
  { label: "Q넷", href: "https://www.q-net.or.kr/" },
] as const;

/** 카카오맵에 등록된 아지트 장소 페이지 */
export function getKakaoMapUrl() {
  return `https://map.kakao.com/?itemId=${SITE.map.kakaoPlaceId}`;
}

/** 카카오맵 길찾기(도착지=아지트) */
export function getKakaoRouteUrl() {
  const { placeName, latitude, longitude } = SITE.map;
  return `https://map.kakao.com/link/to/${encodeURIComponent(placeName)},${latitude},${longitude}`;
}

/** API 키 없이 페이지에 지도를 붙이기 위한 OpenStreetMap 임베드 */
export function getOsmEmbedUrl() {
  const { latitude, longitude } = SITE.map;
  const pad = 0.0018;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - pad}%2C${latitude - pad}%2C${longitude + pad}%2C${latitude + pad}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export const NAV_ITEMS = [
  {
    label: "소개",
    href: "/about",
    children: [
      { label: "스터디 소개", href: "/about" },
      { label: "걸어온 길", href: "/about/history" },
      { label: "우리 아지트", href: "/about/room" },
      { label: "회칙", href: "/about/rules" },
    ],
  },
  {
    label: "학습일정",
    href: "/academics/schedule",
    children: [
      { label: "주차별 시간표", href: "/academics/schedule" },
      { label: "학년별 자료실", href: "/academics/resources" },
      { label: "기출·과제 가이드", href: "/academics/exams" },
      { label: "학습 로드맵", href: "/academics/roadmap" },
    ],
  },
  {
    label: "자료실",
    href: "/academics/resources",
  },
  {
    label: "소모임",
    href: "/labs",
    children: [
      { label: "소모임 목록", href: "/labs" },
      { label: "프로젝트 갤러리", href: "/labs/projects" },
    ],
  },
  {
    label: "커뮤니티",
    href: "/community",
    children: [
      { label: "공지·회계", href: "/community/notice" },
      { label: "BnB 라운지", href: "/community/free" },
      { label: "활동 갤러리", href: "/community/gallery" },
      { label: "신편입생 게시판", href: "/community/qa" },
      { label: "소모임 게시판", href: "/community/club" },
    ],
  },
] as const;
