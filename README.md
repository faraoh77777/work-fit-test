# 핏 테스트 (work-fit-test)

상의·하의·신발을 골라 내 치수 대비 핏을 확인하는 로컬 테스트 앱. 서버 없음, AI 없음(기본 기능만).

- 실행: `index.html` 을 브라우저로 열기
- `fit-config.js` 등급 기준표(경계값, 소재 보정, 선호 핏별 이상 여유분, 추정식). 앱 결과 화면의 "등급 기준 보정"에서도 수정 가능
- `fit-engine.js` 계산 모듈(화면과 독립, node 로도 실행 가능)
- `app.js` 화면·저장. 텍스트는 localStorage, 아바타 이미지·영상은 IndexedDB(이 기기 안에만 저장)
- `tests/engine-sample.js` 예시 값으로 엔진 출력 확인: `node tests/engine-sample.js`

## 나중에 붙일 자리
AI 실측표 판독, 핏 설명, AI 아바타·영상 생성, 사용권(AI 1회 무료)은 아직 없음.
