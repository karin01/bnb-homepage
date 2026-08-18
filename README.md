# Bit & Byte 홈페이지 리뉴얼

한국방송통신대학교 컴퓨터과학과 스터디 **Bit & Byte**의 모던 리뉴얼 프론트엔드입니다.

기존 사이트: [http://bnbstudy.co.kr/](http://bnbstudy.co.kr/)  
공개 미리보기: [https://karin01.github.io/bnb-homepage/](https://karin01.github.io/bnb-homepage/)

## 왜 이렇게 만들었나

그누보드 레이아웃은 정보가 많지만 모바일에서 길을 잃기 쉽습니다.  
이 프로젝트는 **신·편입생 설득**과 **정회원 학습 동선**을 나눠, 입회·일정·자료실·소모임을 한 번의 클릭으로 닿게 합니다.

지금은 콘텐츠를 TypeScript 데이터 모듈로 두었습니다.  
나중에 Supabase나 그누보드 REST를 붙일 때 UI를 다시 짜지 않아도 됩니다.

## 실행 방법

가장 쉬운 방법: `C:\Users\Luna\bnb-homepage\BnB-Homepage.exe` 를 더블클릭합니다.  
서버가 켜지면 브라우저가 `http://localhost:3000` 을 엽니다. 끄려면 검은 창에서 `Ctrl + C`를 누릅니다.

Google Drive 폴더에서는 `npm install`이 실패할 수 있습니다.  
로컬 디스크에서 실행하는 것을 권장합니다.

GitHub Pages 주소는 소스만 정적 HTML로 올린 미리보기입니다. 비회원 글쓰기 IP 검사와 쉐어노트 AI 정리·퀴즈는 로컬 서버(`npm run dev`)에서만 동작합니다.

```bash
cd C:\Users\Luna\bnb-homepage
npm install
npm run dev
```

## 주요 페이지

- `/` 메인 히어로, 공지 티커, 주간 강의, 혜택, 자료실/갤러리
- `/about` 소개 · 연혁 · 아지트 · 회칙
- `/academics/schedule` 학사+스터디 통합 캘린더
- `/academics/resources` 학년/과목 검색 자료실
- `/labs` 소모임 매칭
- `/signup` 홈페이지 계정 가입
- `/login` 홈페이지 로그인
- `/join/apply` 스터디 입회원서 구글폼

## 주의

- 입회원서는 공식 [Bit&Byte 스터디 가입 양식](https://docs.google.com/forms/d/e/1FAIpQLSe7e60br0OGZOX532hXDDcS1VO6-gJWIKv2tD-G2otvVE-qng/viewform)으로 접수합니다.
- 홈페이지 가입은 사이트 계정용이며, 지금은 브라우저에만 저장됩니다. 서버 연동 전 단계입니다.
- 강의 파일·기출 원문은 공개하지 않았습니다. 회원 전용 잠금만 보여 줍니다.
- 회비 계좌는 기존 사이트에 공개된 값을 그대로 옮겼습니다. 운영 중 변경되면 `src/data/site.ts`만 수정하면 됩니다.
