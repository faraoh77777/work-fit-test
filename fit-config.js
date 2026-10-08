/* 핏 기준표. 실제 착용감과 비교하며 여기 값을 보정한다. (앱 하단 "등급 기준 보정"에서도 수정 가능)
   th = [쪼임/타이트 경계, 타이트/정핏 경계, 정핏/여유 경계, 여유/오버핏 경계]  (단위: cm, 신발은 mm)
   예) chest [0,5,11,19] → <0 쪼임, 0~4 타이트, 5~10 정핏, 11~18 여유, 19~ 오버핏 */
(function (root) {
  var CONFIG = {
    version: 1,
    grades: {
      chest: { label: '가슴', unit: 'cm', th: [0, 5, 11, 19] },
      waist: { label: '허리', unit: 'cm', th: [0, 3, 9, 16] },
      hip:   { label: '엉덩이', unit: 'cm', th: [0, 4, 10, 18] },
      thigh: { label: '허벅지', unit: 'cm', th: [0, 4, 11, 19] },
      shoe:  { label: '신발 안쪽 여유', unit: 'mm', th: [3, 7, 13, 18] }
    },
    gradeNames: {
      body: ['쪼임', '타이트', '정핏', '여유', '오버핏'],
      shoe: ['작음', '약간 작음', '딱 맞음', '여유', '큼']
    },
    /* 소재 보정: 둘레 항목 여유분에 더해서 등급을 판정한다(+ 이면 쪼임 허용 범위가 넓어짐) */
    fabric: {
      normal: { label: '일반', bonus: 0 },
      stretch: { label: '스판', bonus: 3 },
      knit: { label: '니트', bonus: 2 },
      denim: { label: '데님', bonus: -1 }
    },
    /* 선호 핏별 이상적인 여유분 (사이즈 추천에 사용) */
    ideal: {
      chest: { tight: 2, fit: 8, loose: 14, over: 22 },
      waist: { tight: 1, fit: 5, loose: 11, over: 18 },
      shoe:  { tight: 5, fit: 10, loose: 14, over: 18 }
    },
    prefNames: { tight: '타이트', fit: '정핏', loose: '여유', over: '오버핏' },
    /* 치수를 입력하지 않았을 때의 추정식 (초안. 사이즈코리아 통계로 교체 예정) */
    estimate: {
      male:   { chest: [0.47, 11],  shoulder: [0.255, 0],    waist: [0.40, 9.2], hip: [0.52, 4.6], thigh: [0.30, 4.0] },
      female: { chest: [0.47, 7.5], shoulder: [0.255, -3.5], waist: [0.40, 3.2], hip: [0.52, 5.5], thigh: [0.30, 4.5] },
      bmiSlope: { chest: 1.9, waist: 2.2, hip: 1.6, thigh: 1.2, shoulder: 0.1 }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
  else root.FIT_CONFIG = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
